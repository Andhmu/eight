// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref, watch } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveChannel = any

export function useLiveViewer(streamerIdRef: () => string | null) {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const videoEl = ref<HTMLVideoElement | null>(null)
  const isWatching = ref(false)
  const busy = ref(false)
  const errorText = ref<string | null>(null)

  const channel = ref<LiveChannel | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)
  const viewerId = ref<string>('')

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub ?? undefined
    if (id) return id
    return 'anon-' + Math.random().toString(36).slice(2)
  }

  function createPeerConnection(streamerId: string, vId: string) {
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
      if (!ev.candidate || !channel.value) return
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          from: 'viewer',
          viewerId: vId,
          candidate: ev.candidate,
        },
      })
    }

    peer.onconnectionstatechange = () => {
      console.log('[viewer] pc state:', peer.connectionState)
    }

    return peer
  }

  async function startWatching() {
    const streamerId = streamerIdRef()
    if (!streamerId || !process.client) return
    if (busy.value || isWatching.value) return

    busy.value = true
    errorText.value = null

    try {
      viewerId.value = getViewerId()

      const ch = client.channel(`live:${streamerId}`, {
        config: { broadcast: { ack: true } },
      })

      const localPc = createPeerConnection(streamerId, viewerId.value)
      pc.value = localPc

      // оффер от стримера
      ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.viewerId !== viewerId.value) return
        try {
          await localPc.setRemoteDescription(
            new RTCSessionDescription(payload.sdp),
          )
          const answer = await localPc.createAnswer()
          await localPc.setLocalDescription(answer)

          channel.value?.send({
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
      ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from !== 'streamer') return
        if (payload.viewerId !== viewerId.value) return
        try {
          await localPc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } catch (e) {
          console.warn('[viewer] error addIceCandidate from streamer', e)
        }
      })

      const { status } = await ch.subscribe()
      console.log('[viewer] channel subscribe status', status)
      channel.value = ch

      // говорим стримеру, что хотим смотреть
      ch.send({
        type: 'broadcast',
        event: 'viewer-join',
        payload: {
          viewerId: viewerId.value,
        },
      })

      isWatching.value = true
    } catch (e) {
      console.error('[viewer] error startWatching', e)
      errorText.value = 'Не удалось подключиться к эфиру.'
    } finally {
      busy.value = false
    }
  }

  function stopWatching() {
    if (channel.value) {
      channel.value.unsubscribe()
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

  // если поменялся streamerId — перезапускаем просмотр
  watch(
    streamerIdRef,
    (val, oldVal) => {
      if (val === oldVal) return
      stopWatching()
      if (val) startWatching()
    },
    { immediate: false },
  )

  return {
    videoEl,
    isWatching,
    busy,
    errorText,
    startWatching,
    stopWatching,
  }
}
