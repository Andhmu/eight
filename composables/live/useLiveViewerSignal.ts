// composables/live/useLiveViewerSignal.ts
import { ref, type Ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { LiveSignalPayload } from './liveTypes'

export function useLiveViewerSignal(videoEl: Ref<HTMLVideoElement | null>) {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isWatching = ref(false)
  const streamerId = ref<string | null>(null)
  const viewerId = ref<string | null>(null)

  const channel = ref<ReturnType<typeof client.channel> | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub ?? undefined
    if (id) return id
    return 'anon-' + Math.random().toString(36).slice(2)
  }

  async function attachRemoteStream(stream: MediaStream) {
    if (!videoEl.value) {
      console.warn('[viewer] no video element to attach stream')
      return
    }

    const v = videoEl.value
    v.srcObject = stream
    ;(v as any).playsInline = true
    v.autoplay = true

    try {
      await v.play()
      console.log('[viewer] video element playing')
    } catch (e) {
      console.warn('[viewer] video play error:', e)
    }
  }

  function createPeerConnection(): RTCPeerConnection {
    console.log('[viewer] createPeerConnection')

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      console.log('[viewer] ontrack fired, streams:', ev.streams.length)
      if (remoteStream) {
        void attachRemoteStream(remoteStream)
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value || !viewerId.value) return

      console.log('[viewer] send ICE to streamer')
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          viewerId: viewerId.value,
          candidate: ev.candidate.toJSON(),
        },
      })
    }

    peer.onconnectionstatechange = () => {
      console.log('[viewer] pc state:', peer.connectionState)
    }

    return peer
  }

  function stopPeer() {
    if (pc.value) {
      console.log('[viewer] close peer connection')
      pc.value.close()
      pc.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
  }

  function stopSignalChannel() {
    if (channel.value) {
      console.log('[viewer] stop signal channel')
      channel.value.unsubscribe()
      channel.value = null
    }
  }

  async function openForStreamer(id: string) {
    if (!process.client) return

    console.log('[viewer] openForStreamer', id)

    stopPeer()
    stopSignalChannel()

    streamerId.value = id
    viewerId.value = getViewerId()

    const ch = client.channel(`live-${id}`, {
      config: { broadcast: { self: false } },
    })

    ch.on('broadcast', { event: 'offer' }, async (payload: LiveSignalPayload) => {
      const p = payload as any
      console.log('[viewer] got offer payload', p)

      if (p.viewerId !== viewerId.value || !p.offer) {
        console.log('[viewer] offer ignored, viewerId mismatch or no offer')
        return
      }

      console.log('[viewer] handling offer from streamer')

      if (!pc.value) {
        pc.value = createPeerConnection()
      }

      try {
        await pc.value.setRemoteDescription(new RTCSessionDescription(p.offer))
        const answer = await pc.value.createAnswer()
        await pc.value.setLocalDescription(answer)

        console.log('[viewer] send answer to streamer')
        ch.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            viewerId: viewerId.value,
            answer,
          },
        })
      } catch (e) {
        console.error('[viewer] error handle offer:', e)
      }
    })

    ch.on('broadcast', { event: 'ice-candidate' }, async (payload: LiveSignalPayload) => {
      const p = payload as any
      if (p.viewerId !== viewerId.value || !p.candidate) {
        return
      }
      if (!pc.value) {
        console.warn('[viewer] got ICE but no pc')
        return
      }

      console.log('[viewer] add ICE from streamer')
      try {
        await pc.value.addIceCandidate(new RTCIceCandidate(p.candidate))
      } catch (e) {
        console.warn('[viewer] error add ICE from streamer:', e)
      }
    })

    await ch.subscribe((status) => {
      console.log('[viewer] channel status', status)
    })

    channel.value = ch
    pc.value = createPeerConnection()

    console.log('[viewer] viewer-join sent')
    ch.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: viewerId.value },
    })

    isWatching.value = true
  }

  function closeViewer() {
    console.log('[viewer] closeViewer')
    isWatching.value = false
    streamerId.value = null

    stopPeer()
    stopSignalChannel()
  }

  return {
    isWatching,
    openForStreamer,
    closeViewer,
  }
}
