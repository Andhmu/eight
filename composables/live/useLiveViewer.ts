// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useLiveViewer() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const videoEl = ref<HTMLVideoElement | null>(null)
  const isWatching = ref(false)
  const busy = ref(false)
  const error = ref<string | null>(null)

  const channel = ref<any | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)
  const currentStreamerId = ref<string | null>(null)
  const viewerIdRef = ref<string | null>(null)

  function getViewerId(): string {
    if (viewerIdRef.value) return viewerIdRef.value

    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub
    const finalId = id ?? 'anon-' + Math.random().toString(36).slice(2)
    viewerIdRef.value = finalId
    return finalId
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
        ;(videoEl.value as any).playsInline = true
        console.log('[viewer] got remote stream from', streamerId)
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          viewerId,
          candidate: ev.candidate,
        },
      })
    }

    peer.onconnectionstatechange = () => {
      console.log('[viewer] pc state:', peer.connectionState)
    }

    return peer
  }

  async function startWatching(streamerId: string) {
    if (busy.value) return
    busy.value = true
    error.value = null

    const viewerId = getViewerId()
    currentStreamerId.value = streamerId

    try {
      const ch = client.channel(`live:${streamerId}`)

      // Приходит offer от стримера
      ch.on('broadcast', { event: 'offer' }, async (payload: any) => {
        if (payload.viewerId !== viewerId) return

        console.log('[viewer] got offer from', streamerId)

        if (!pc.value) {
          pc.value = createPeerConnection(streamerId, viewerId)
        }

        try {
          await pc.value!.setRemoteDescription(
            new RTCSessionDescription(payload.offer),
          )

          const answer = await pc.value!.createAnswer()
          await pc.value!.setLocalDescription(answer)

          await ch.send({
            type: 'broadcast',
            event: 'answer',
            payload: {
              viewerId,
              answer,
            },
          })
        } catch (e) {
          console.error('[viewer] error handle offer/answer', e)
        }
      })

      // ICE от стримера
      ch.on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
        if (payload.viewerId !== viewerId) return
        if (!pc.value) return

        try {
          await pc.value!.addIceCandidate(
            new RTCIceCandidate(payload.candidate),
          )
        } catch (e) {
          console.warn('[viewer] error add ICE', e)
        }
      })

      const { status } = await ch.subscribe()
      console.log('[viewer] channel subscribe status', status)
      channel.value = ch

      // Говорим стримеру, что мы хотим смотреть
      await ch.send({
        type: 'broadcast',
        event: 'viewer-join',
        payload: { viewerId },
      })

      isWatching.value = true
    } catch (e) {
      console.error('[viewer] startWatching error', e)
      error.value = 'Не удалось подключиться к эфиру.'
    } finally {
      busy.value = false
    }
  }

  async function stopWatching() {
    if (channel.value) {
      try {
        await channel.value.unsubscribe()
      } catch (e) {
        console.warn('[viewer] unsubscribe error', e)
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
    void stopWatching()
  })

  return {
    videoEl,
    isWatching,
    busy,
    error,
    startWatching,
    stopWatching,
  }
}