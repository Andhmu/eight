// composables/live/useMyLive.ts
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveSignalPayload =
  | { viewerId: string }
  | { viewerId: string; offer: RTCSessionDescriptionInit }
  | { viewerId: string; answer: RTCSessionDescriptionInit }
  | { viewerId: string; candidate: RTCIceCandidateInit }

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  // WebRTC signaling
  const channel = ref<ReturnType<typeof client.channel> | null>(null)
  const peers = new Map<string, RTCPeerConnection>()

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  // ---------- КАМЕРА ----------

  async function startCamera() {
    if (!process.client) return

    console.log('[my-live] startCamera called')

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    mediaStream.value = stream

    if (videoEl.value) {
      const v = videoEl.value
      v.srcObject = stream
      v.muted = true
      // @ts-expect-error playsInline нет в типах
      v.playsInline = true

      try {
        await v.play()
        console.log('[my-live] local video started')
      } catch (e) {
        console.warn('[my-live] video play error:', e)
      }
    } else {
      console.warn('[my-live] no video element for local preview')
    }
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

  // ---------- SIGNALING КАНАЛ ДЛЯ СТРИМЕРА ----------

  async function ensureSignalChannel(streamerId: string) {
    if (channel.value) return

    console.log('[my-live] create signal channel for', streamerId)

    const ch = client.channel(`live-${streamerId}`, {
      config: {
        broadcast: { self: false },
      },
    })

    // зритель зашёл – создаём peer и отправляем offer
    ch.on('broadcast', { event: 'viewer-join' }, async (msg: any) => {
      // !!! ВАЖНО: данные лежат в msg.payload
      const payload = msg?.payload as LiveSignalPayload | undefined
      const viewerId = (payload as any)?.viewerId as string | undefined
      if (!viewerId) {
        console.warn('[my-live] viewer-join without viewerId', msg)
        return
      }

      try {
        console.log('[my-live] viewer-join', viewerId)

        const pc = createPeerConnection(viewerId)
        peers.set(viewerId, pc)

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        ch.send({
          type: 'broadcast',
          event: 'offer',
          payload: { viewerId, offer },
        })
        console.log('[my-live] offer sent to', viewerId)
      } catch (e) {
        console.error('[my-live] error on viewer-join:', e)
      }
    })

    // получили answer от зрителя
    ch.on('broadcast', { event: 'answer' }, async (msg: any) => {
      const payload = msg?.payload as LiveSignalPayload | undefined
      const viewerId = (payload as any)?.viewerId
      const answer = (payload as any)?.answer
      if (!viewerId || !answer) return

      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        console.log('[my-live] answer applied from', viewerId)
      } catch (e) {
        console.error('[my-live] error apply answer:', e)
      }
    })

    // ICE-кандидаты от зрителя
    ch.on('broadcast', { event: 'ice-candidate' }, async (msg: any) => {
      const payload = msg?.payload as LiveSignalPayload | undefined
      const viewerId = (payload as any)?.viewerId
      const candidate = (payload as any)?.candidate
      if (!viewerId || !candidate) return

      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('[my-live] error add ICE from viewer', viewerId, e)
      }
    })

    await ch.subscribe((status) => {
      console.log('[my-live] channel status', status)
    })

    channel.value = ch
  }

  function stopSignalChannel() {
    if (channel.value) {
      console.log('[my-live] stop signal channel')
      channel.value.unsubscribe()
      channel.value = null
    }

    peers.forEach((pc) => pc.close())
    peers.clear()
  }

  function createPeerConnection(viewerId: string): RTCPeerConnection {
    console.log('[my-live] createPeerConnection for', viewerId)

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // отправляем локальные треки зрителю
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        mediaStream.value && pc.addTrack(track, mediaStream.value!)
      })
    } else {
      console.warn('[my-live] no mediaStream when creating pc for', viewerId)
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return

      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          viewerId,
          candidate: ev.candidate.toJSON(),
        },
      })
    }

    pc.onconnectionstatechange = () => {
      console.log('[my-live] pc state', viewerId, pc.connectionState)
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        peers.delete(viewerId)
      }
    }

    return pc
  }

  // ---------- ПУБЛИЧНЫЕ МЕТОДЫ ----------

  async function loadInitial() {
    const id = getUserId()
    if (!id) return

    const { data, error } = await client
      .from('profiles')
      .select('is_live')
      .eq('id', id)
      .maybeSingle()

    if (!error && data?.is_live) {
      isLive.value = true
    } else {
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
      // 1. показываем блок «Я в эфире», чтобы <video> отрендерилось
      isLive.value = true
      if (process.client) {
        await nextTick()
      }

      // 2. включаем камеру
      await startCamera()

      // 3. включаем signaling
      await ensureSignalChannel(id)

      // 4. помечаем профиль как «в эфире»
      const { error } = await client
        .from('profiles')
        .update({
          is_live: true,
          live_started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] set is_live=true error:', error)
        alert('Не удалось пометить профиль как «в эфире».')
        stopCamera()
        stopSignalChannel()
        isLive.value = false
      }
    } catch (e) {
      console.error('[my-live] startLive error:', e)
      alert('Не удалось запустить трансляцию.')
      stopCamera()
      stopSignalChannel()
      isLive.value = false
    } finally {
      busy.value = false
    }
  }

  async function stopLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()

    stopCamera()
    stopSignalChannel()

    if (id) {
      const { error } = await client
        .from('profiles')
        .update({
          is_live: false,
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] set is_live=false error:', error)
      }
    }

    isLive.value = false
    busy.value = false
  }

  onBeforeUnmount(() => {
    stopCamera()
    stopSignalChannel()
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
