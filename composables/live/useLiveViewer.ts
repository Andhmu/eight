// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useLiveViewer() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const videoEl = ref<HTMLVideoElement | null>(null)
  const isWatching = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const channel = ref<any | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)
  const viewerId = ref<string | null>(null)

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
      if (videoEl.value) {
        videoEl.value.srcObject = remoteStream
        videoEl.value.playsInline = true
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value || !viewerId.value) return
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          viewerId: viewerId.value,
          candidate: ev.candidate,
        },
      })
    }

    return peer
  }

  async function startWatching(streamerId: string) {
    if (isWatching.value || loading.value) return
    if (!streamerId) {
      error.value = 'Не указан стример'
      return
    }

    loading.value = true
    error.value = null

    viewerId.value = getViewerId()
    pc.value = createPeerConnection()

    const ch = client.channel(`live:${streamerId}`)

    // получаем offer от стримера
    ch.on('broadcast', { event: 'offer' }, async (payload) => {
      if (!pc.value || payload.viewerId !== viewerId.value) return
      try {
        await pc.value.setRemoteDescription(
          new RTCSessionDescription(payload.sdp),
        )
        const answer = await pc.value.createAnswer()
        await pc.value.setLocalDescription(answer)

        ch.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            viewerId: viewerId.value,
            sdp: answer,
          },
        })
      } catch (e) {
        console.error('[viewer] error handle offer', e)
      }
    })

    // ICE от стримера
    ch.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
      if (!pc.value || payload.viewerId !== viewerId.value) return
      try {
        await pc.value.addIceCandidate(
          new RTCIceCandidate(payload.candidate),
        )
      } catch (e) {
        console.error('[viewer] error addIceCandidate', e)
      }
    })

    const { status } = await ch.subscribe()
    console.log('[viewer] channel subscribe status:', status)

    channel.value = ch

    // даём знать стримеру, что мы хотим подключиться
    ch.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: viewerId.value },
    })

    isWatching.value = true
    loading.value = false
  }

  async function stopWatching() {
    if (channel.value) {
      try {
        await channel.value.unsubscribe()
      } catch (e) {
        console.warn('[viewer] error unsubscribe channel:', e)
      }
      channel.value = null
    }
    if (pc.value) {
      pc.value.close()
      pc.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
    isWatching.value = false
  }

  onBeforeUnmount(() => {
    stopWatching()
  })

  return {
    videoEl,
    isWatching,
    loading,
    error,
    startWatching,
    stopWatching,
  }
}
