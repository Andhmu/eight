// composables/live/useMyLive.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)

  // видео на моей стороне
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  // сигналинг-канал + список WebRTC-пиров (зрителей)
  const channel = ref<any | null>(null)
  const peers = new Map<string, RTCPeerConnection>()

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  function stopCamera() {
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((t) => t.stop())
      mediaStream.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
  }

  function createPeerConnection(viewerId: string): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

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
      console.log('[my-live] peer', viewerId, 'state:', peer.connectionState)
    }

    return peer
  }

  async function startSignalChannel(streamerId: string) {
    const ch = client.channel(`live:${streamerId}`)

    // Зритель подключился – создаём для него peer и шлём offer
    ch.on('broadcast', { event: 'viewer-join' }, async (payload: any) => {
      const viewerId: string = payload.viewerId
      console.log('[my-live] viewer-join', viewerId)

      if (!mediaStream.value) {
        console.warn('[my-live] no mediaStream for viewer', viewerId)
        return
      }

      let pc = peers.get(viewerId)
      if (!pc) {
        pc = createPeerConnection(viewerId)
        peers.set(viewerId, pc)

        mediaStream.value.getTracks().forEach((t) => {
          pc!.addTrack(t, mediaStream.value as MediaStream)
        })
      }

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        await ch.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            viewerId,
            offer,
          },
        })
      } catch (e) {
        console.error('[my-live] error create/send offer', e)
      }
    })

    // Получаем answer от зрителя
    ch.on('broadcast', { event: 'answer' }, async (payload: any) => {
      const viewerId: string = payload.viewerId
      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription(payload.answer),
        )
      } catch (e) {
        console.error('[my-live] error setRemoteDescription(answer)', e)
      }
    })

    // Получаем ICE-кандидаты от зрителей
    ch.on('broadcast', { event: 'ice-candidate' }, async (payload: any) => {
      const viewerId: string = payload.viewerId
      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
      } catch (e) {
        console.warn('[my-live] error addIceCandidate from viewer', e)
      }
    })

    const { status } = await ch.subscribe()
    console.log('[my-live] signal channel status:', status)
    channel.value = ch
  }

  async function stopSignalChannel() {
    if (channel.value) {
      try {
        await channel.value.unsubscribe()
      } catch (e) {
        console.warn('[my-live] unsubscribe error', e)
      }
      channel.value = null
    }

    peers.forEach((pc) => pc.close())
    peers.clear()
  }

  async function loadInitial() {
    const id = getUserId()
    if (!id) return

    const { data, error } = await client
      .from('profiles')
      .select('is_live')
      .eq('id', id)
      .maybeSingle()

    if (!error && data?.is_live) {
      // статус в базе, но камеру автоматически не включаем
      isLive.value = false
    }
  }

  async function startLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()
    if (!id) {
      busy.value = false
      alert('Чтобы начать эфир, нужно войти в аккаунт.')
      return
    }

    try {
      // 1. включаем камеру
      if (process.client && videoEl.value) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        mediaStream.value = stream

        const v = videoEl.value
        v.srcObject = stream
        v.muted = true
        ;(v as any).playsInline = true

        try {
          await v.play()
          console.log('[my-live] local video started')
        } catch (e) {
          console.warn('[my-live] video play error', e)
        }
      } else {
        console.warn('[my-live] no video element or not client')
      }

      // 2. отмечаем себя «в эфире» в профиле
      await client
        .from('profiles')
        .update({
          is_live: true,
          live_started_at: new Date().toISOString(),
        })
        .eq('id', id)

      // 3. запускаем сигналинг-канал
      await startSignalChannel(id)

      isLive.value = true
    } catch (e) {
      console.error('[my-live] error startLive', e)
      alert('Не удалось запустить эфир.')
      stopCamera()
      await stopSignalChannel()
    } finally {
      busy.value = false
    }
  }

  async function stopLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()

    stopCamera()
    await stopSignalChannel()

    if (id) {
      try {
        await client.from('profiles').update({ is_live: false }).eq('id', id)
      } catch (e) {
        console.error('[my-live] error clear is_live', e)
      }
    }

    isLive.value = false
    busy.value = false
  }

  onBeforeUnmount(() => {
    stopCamera()
    void stopSignalChannel()
  })

  return {
    isLive,
    busy,
    videoEl,
    loadInitial,
    startLive,
    stopLive,
  }
}
