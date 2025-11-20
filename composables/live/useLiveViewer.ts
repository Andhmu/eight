// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveSignalPayload =
  | { viewerId: string }
  | { viewerId: string; offer: RTCSessionDescriptionInit }
  | { viewerId: string; answer: RTCSessionDescriptionInit }
  | { viewerId: string; candidate: RTCIceCandidateInit }

export function useLiveViewer() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isWatching = ref(false)
  const videoEl = ref<HTMLVideoElement | null>(null)

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

  function createPeerConnection(): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      console.log('[viewer] ontrack, got remote stream', remoteStream?.id)
      if (videoEl.value && remoteStream) {
        const v = videoEl.value
        v.srcObject = remoteStream
        // @ts-expect-error playsInline нет в типах
        v.playsInline = true
        v.autoplay = true
        v.muted = true
        v
          .play()
          .then(() => {
            console.log('[viewer] video playback started')
          })
          .catch((e) => {
            console.warn('[viewer] video play error', e)
          })
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value || !viewerId.value) return

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

    stopPeer()
    stopSignalChannel()

    streamerId.value = id
    viewerId.value = getViewerId()

    const ch = client.channel(`live-${id}`, {
      config: { broadcast: { self: false } },
    })

    ch.on('broadcast', { event: 'offer' }, async (payload: LiveSignalPayload) => {
      const p = payload as any
      if (p.viewerId !== viewerId.value || !p.offer) return

      console.log('[viewer] got offer from streamer')

      if (!pc.value) {
        pc.value = createPeerConnection()
      }

      try {
        await pc.value.setRemoteDescription(new RTCSessionDescription(p.offer))
        const answer = await pc.value.createAnswer()
        await pc.value.setLocalDescription(answer)

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

    ch.on(
      'broadcast',
      { event: 'ice-candidate' },
      async (payload: LiveSignalPayload) => {
        const p = payload as any
        if (p.viewerId !== viewerId.value || !p.candidate) return
        if (!pc.value) return

        try {
          await pc.value.addIceCandidate(new RTCIceCandidate(p.candidate))
        } catch (e) {
          console.warn('[viewer] error add ICE from streamer:', e)
        }
      },
    )

    channel.value = ch
    pc.value = createPeerConnection()

    await ch.subscribe((status) => {
      console.log('[viewer] channel status', status)
      if (status === 'SUBSCRIBED' && viewerId.value) {
        ch.send({
          type: 'broadcast',
          event: 'viewer-join',
          payload: { viewerId: viewerId.value },
        })
      }
    })

    isWatching.value = true
  }

  function closeViewer() {
    isWatching.value = false
    streamerId.value = null

    stopPeer()
    stopSignalChannel()
  }

  onBeforeUnmount(() => {
    closeViewer()
  })

  return {
    isWatching,
    videoEl,
    openForStreamer,
    closeViewer,
  }
}