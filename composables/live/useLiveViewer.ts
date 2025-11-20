// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { LiveCandidate } from './useLiveNow'

type LiveSignalChannel = any

export function useLiveViewer() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const videoEl = ref<HTMLVideoElement | null>(null)
  const isWatching = ref(false)
  const busy = ref(false)

  const panelOpen = ref(false)
  const currentStreamer = ref<LiveCandidate | null>(null)

  const channel = ref<LiveSignalChannel | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub ?? undefined
    if (id) return id
    return `anon-${Math.random().toString(36).slice(2)}`
  }

  function cleanupPeer() {
    if (pc.value) {
      pc.value.close()
      pc.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
  }

  async function cleanupChannel() {
    if (channel.value) {
      try {
        channel.value.unsubscribe()
      } catch (e) {
        console.warn('[viewer] channel unsubscribe error', e)
      }
      channel.value = null
    }
  }

  function createPeerConnection(
    streamerId: string,
    viewerId: string,
  ): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      if (videoEl.value) {
        videoEl.value.srcObject = remoteStream
        // @ts-expect-error playsInline не в типах
        videoEl.value.playsInline = true
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return

      channel.value.send({
        type: 'broadcast',
        event: 'viewer-ice',
        payload: {
          viewerId,
          candidate: ev.candidate,
        },
      })
    }

    peer.onconnectionstatechange = () => {
      console.log('[viewer] peer state', peer.connectionState)
      if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'closed'
      ) {
        cleanupPeer()
      }
    }

    pc.value = peer
    return peer
  }

  async function connectToStreamer(streamer: LiveCandidate) {
    if (busy.value) return
    busy.value = true

    const streamerId = streamer.id
    const viewerId = getViewerId()

    await cleanupChannel()
    cleanupPeer()

    if (!process.client) {
      busy.value = false
      return
    }

    const ch = client.channel(`live:${streamerId}`, {
      config: { broadcast: { self: false } },
    })

    // Получаем offer от стримера
    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.viewerId !== viewerId) return

      console.log('[viewer] got offer from streamer')
      const sdp = payload.sdp
      try {
        const peer = pc.value ?? createPeerConnection(streamerId, viewerId)
        await peer.setRemoteDescription(new RTCSessionDescription(sdp))

        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)

        channel.value?.send({
          type: 'broadcast',
          event: 'viewer-answer',
          payload: {
            viewerId,
            sdp: answer,
          },
        })
      } catch (e) {
        console.error('[viewer] error handling offer', e)
      }
    })

    // ICE-кандидаты от стримера
    ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      if (payload.viewerId !== viewerId) return
      const candidate = payload.candidate
      if (!pc.value) return

      try {
        await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('[viewer] error addIceCandidate from streamer', e)
      }
    })

    await new Promise<void>((resolve) => {
      ch.subscribe((status: string) => {
        console.log('[viewer] channel status', status)
        if (status === 'SUBSCRIBED') resolve()
      })
    })

    channel.value = ch

    // говорим стримеру, что хотим смотреть
    channel.value.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId },
    })

    isWatching.value = true
    busy.value = false
  }

  async function watchStreamer(streamer: LiveCandidate) {
    currentStreamer.value = streamer
    panelOpen.value = true
    await connectToStreamer(streamer)
  }

  async function stopWatching() {
    await cleanupChannel()
    cleanupPeer()
    isWatching.value = false
    panelOpen.value = false
  }

  onBeforeUnmount(() => {
    void stopWatching()
  })

  return {
    videoEl,
    isWatching,
    busy,
    panelOpen,
    currentStreamer,
    watchStreamer,
    stopWatching,
  }
}