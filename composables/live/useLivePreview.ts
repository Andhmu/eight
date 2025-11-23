// composables/live/useLivePreview.ts
import { ref, type Ref } from 'vue'
import { useSupabaseClient } from '#imports'

type LiveSignalPayload =
  | { viewerId: string }
  | { viewerId: string; offer: RTCSessionDescriptionInit }
  | { viewerId: string; answer: RTCSessionDescriptionInit }
  | { viewerId: string; candidate: RTCIceCandidateInit }

export function useLivePreview(videoEl: Ref<HTMLVideoElement | null>) {
  const client = useSupabaseClient()

  const isPreviewing = ref(false)
  const channel = ref<ReturnType<typeof client.channel> | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)
  const viewerId = ref<string | null>(null)
  const streamerId = ref<string | null>(null)

  const pendingIce = ref<RTCIceCandidateInit[]>([])
  const isReconnecting = ref(false)

  function stopPeer() {
    if (pc.value) {
      pc.value.close()
      pc.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
    pendingIce.value = []
  }

  function stopChannel() {
    if (channel.value) {
      channel.value.unsubscribe()
      channel.value = null
    }
  }

  async function flushPendingIce() {
    if (!pc.value || !pc.value.remoteDescription) return
    const list = pendingIce.value
    if (!list.length) return

    console.log('[preview] flushing ICE, count', list.length)
    for (const c of list) {
      try {
        await pc.value.addIceCandidate(new RTCIceCandidate(c))
      } catch (e) {
        console.warn('[preview] error add pending ICE', e)
      }
    }
    pendingIce.value = []
  }

  function scheduleReconnect(reason: string) {
    if (!streamerId.value || !isPreviewing.value) return
    if (isReconnecting.value) return

    console.log('[preview] schedule reconnect, reason =', reason)
    isReconnecting.value = true

    // раньше было ~800ms, делаем быстрее
    setTimeout(() => {
      isReconnecting.value = false
      if (!streamerId.value || !isPreviewing.value) return
      void startPreview(streamerId.value)
    }, 200)
  }

  function createPeerConnection(): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      if (!remoteStream || !videoEl.value) return

      const v = videoEl.value
      v.srcObject = remoteStream
      ;(v as any).playsInline = true
      v.autoplay = true
      v.muted = true
      v.controls = false

      v
        .play()
        .then(() => {
          console.log('[preview] video playing')
        })
        .catch((err: any) => {
          if (err?.name === 'AbortError') {
            console.warn('[preview] play aborted (second load), ignore')
          } else {
            console.warn('[preview] play error:', err)
          }
        })
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
      const state = peer.connectionState
      console.log('[preview] pc state:', state)

      if (!isPreviewing.value) return
      if (state === 'failed' || state === 'disconnected') {
        // например, стример переключил камеру
        scheduleReconnect(state)
      }
    }

    return peer
  }

  async function startPreview(id: string) {
    if (!process.client) return

    console.log('[preview] startPreview', id)

    // закрываем предыдущий превью, если был
    stopPeer()
    stopChannel()

    streamerId.value = id
    viewerId.value = 'preview-' + Math.random().toString(36).slice(2)

    const ch = client.channel(`live-${id}`, {
      config: { broadcast: { self: false } },
    })

    // OFFER от стримера
    ch.on('broadcast', { event: 'offer' }, async (message: any) => {
      const payload = (message as { payload: LiveSignalPayload }).payload as any
      const vId = payload?.viewerId
      const offer = payload?.offer
      if (vId !== viewerId.value || !offer) return

      console.log('[preview] got offer')

      if (!pc.value) {
        pc.value = createPeerConnection()
      }

      try {
        await pc.value.setRemoteDescription(new RTCSessionDescription(offer))
        await flushPendingIce()

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
        console.error('[preview] error handle offer', e)
        scheduleReconnect('offer-error')
      }
    })

    // ICE от стримера
    ch.on('broadcast', { event: 'ice-candidate' }, async (message: any) => {
      const payload = (message as { payload: LiveSignalPayload }).payload as any
      const vId = payload?.viewerId
      const candidate = payload?.candidate as RTCIceCandidateInit | undefined
      if (vId !== viewerId.value || !candidate) return

      if (!pc.value || !pc.value.remoteDescription) {
        pendingIce.value.push(candidate)
        return
      }

      try {
        await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('[preview] error add ICE', e)
      }
    })

    // если стример явно завершил эфир
    ch.on('broadcast', { event: 'stream-ended' }, () => {
      console.log('[preview] stream-ended')
      stopPreview()
    })

    await ch.subscribe((status) => {
      console.log('[preview] channel status', status)
    })

    channel.value = ch
    pc.value = createPeerConnection()

    console.log('[preview] viewer-join sent')
    ch.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: viewerId.value },
    })

    isPreviewing.value = true
  }

  function stopPreview() {
    console.log('[preview] stopPreview')
    isPreviewing.value = false
    streamerId.value = null
    viewerId.value = null
    isReconnecting.value = false
    stopPeer()
    stopChannel()
  }

  return {
    isPreviewing,
    startPreview,
    stopPreview,
  }
}