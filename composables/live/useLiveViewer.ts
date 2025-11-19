// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveChannel = any

export function useLiveViewer() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isWatching = ref(false)
  const busy = ref(false)

  const currentStreamerId = ref<string | null>(null)
  const videoEl = ref<HTMLVideoElement | null>(null)

  const channel = ref<LiveChannel | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | null = raw?.id ?? raw?.sub ?? null
    if (id) return id
    // гость — выдаём временный id
    return `anon-${Math.random().toString(36).slice(2)}`
  }

  function createPeerConnection(streamerId: string, viewerId: string) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      if (videoEl.value) {
        videoEl.value.srcObject = remoteStream
        // @ts-expect-error playsInline нет в типах
        videoEl.value.playsInline = true
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
      console.log(
        '[viewer]',
        streamerId,
        'pc state',
        peer.connectionState,
      )
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        stopViewing()
      }
    }

    return peer
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

  function cleanupChannel() {
    if (channel.value) {
      channel.value.unsubscribe()
      channel.value = null
    }
  }

  async function startViewing(streamerId: string) {
    if (!process.client) return
    if (busy.value) return

    // если уже смотрим этого же — ничего не делаем
    if (isWatching.value && currentStreamerId.value === streamerId) return

    busy.value = true

    try {
      // останавливаем предыдущий просмотр
      cleanupPeer()
      cleanupChannel()

      const viewerId = getViewerId()
      currentStreamerId.value = streamerId

      const ch = client.channel(`live:${streamerId}`)

      ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.viewerId !== viewerId) return
        console.log('[viewer] got offer from', streamerId)

        if (!pc.value) {
          pc.value = createPeerConnection(streamerId, viewerId)
        }

        const desc = new RTCSessionDescription(payload.sdp)
        await pc.value.setRemoteDescription(desc)

        const answer = await pc.value.createAnswer()
        await pc.value.setLocalDescription(answer)

        ch.send({
          type: 'broadcast',
          event: 'answer',
          payload: { viewerId, sdp: pc.value.localDescription },
        })
      })

      ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.viewerId !== viewerId) return
        if (!pc.value) return

        try {
          await pc.value.addIceCandidate(
            new RTCIceCandidate(payload.candidate),
          )
        } catch (e) {
          console.warn('[viewer] error addIceCandidate', e)
        }
      })

      const { status } = await ch.subscribe()
      console.log('[viewer] channel subscribe', status)
      channel.value = ch

      // сразу создаём PeerConnection, чтобы ICE отправлялись
      pc.value = createPeerConnection(streamerId, viewerId)

      // даём знать стримеру, что мы хотим подключиться
      ch.send({
        type: 'broadcast',
        event: 'viewer-join',
        payload: { viewerId },
      })

      isWatching.value = true
    } catch (e) {
      console.error('[viewer] startViewing error', e)
      cleanupPeer()
      cleanupChannel()
      isWatching.value = false
    } finally {
      busy.value = false
    }
  }

  function stopViewing() {
    cleanupPeer()
    cleanupChannel()
    isWatching.value = false
    currentStreamerId.value = null
  }

  onBeforeUnmount(() => {
    stopViewing()
  })

  return {
    isWatching,
    busy,
    videoEl,
    currentStreamerId,
    startViewing,
    stopViewing,
  }
}
