// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref, watch } from 'vue'
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

  // 🟢 ВАЖНО: здесь будем хранить полученный поток от стримера
  const remoteStream = ref<MediaStream | null>(null)

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub ?? undefined
    if (id) return id

    // гость – временный id
    return 'anon-' + Math.random().toString(36).slice(2)
  }

  function attachRemoteStreamToVideo() {
    if (videoEl.value && remoteStream.value) {
      videoEl.value.srcObject = remoteStream.value
      // @ts-expect-error playsInline нет в типах
      videoEl.value.playsInline = true
      videoEl.value.autoplay = true

      // попытка запустить воспроизведение (на всякий случай)
      videoEl.value
        .play()
        .catch((e) => console.warn('[viewer] video play error:', e))
    }
  }

  function createPeerConnection(): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // когда приходят треки от стримера
    peer.ontrack = (ev) => {
      const [stream] = ev.streams
      console.log('[viewer] ontrack, got remote stream', stream)

      if (!stream) return
      remoteStream.value = stream
      attachRemoteStreamToVideo()
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
    remoteStream.value = null
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

    // закрываем предыдущую сессию
    stopPeer()
    stopSignalChannel()

    streamerId.value = id
    viewerId.value = getViewerId()

    const ch = client.channel(`live-${id}`, {
      config: { broadcast: { self: false } },
    })

    // получили offer от стримера
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

    // ICE-кандидаты от стримера
    ch.on('broadcast', { event: 'ice-candidate' }, async (payload: LiveSignalPayload) => {
      const p = payload as any
      if (p.viewerId !== viewerId.value || !p.candidate) return
      if (!pc.value) return

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

    // создаём PeerConnection заранее
    pc.value = createPeerConnection()

    // говорим стримеру, что хотим смотреть
    ch.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: viewerId.value },
    })
    console.log('[viewer] viewer-join sent')

    // открываем панель
    isWatching.value = true
  }

  function closeViewer() {
    isWatching.value = false
    streamerId.value = null

    stopPeer()
    stopSignalChannel()
  }

  // 🟢 Ключевой момент: как только появляется/меняется <video>, пробуем
  // прикрепить к нему поток, который уже мог прийти раньше
  watch(videoEl, () => {
    attachRemoteStreamToVideo()
  })

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
