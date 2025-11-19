// composables/live/useMyLive.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveChannel = any // чтобы не тащить типы RealtimeChannel

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)

  // локальное видео «я себя вижу»
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  // WebRTC + сигнальный канал
  const channel = ref<LiveChannel | null>(null)
  const peers = new Map<string, RTCPeerConnection>() // viewerId -> peer

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  function createPeerConnection(viewerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream.value as MediaStream)
      })
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { viewerId, candidate: ev.candidate },
      })
    }

    pc.onconnectionstatechange = () => {
      console.log('[my-live] pc state', viewerId, pc.connectionState)
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peers.delete(viewerId)
        pc.close()
      }
    }

    return pc
  }

  async function setupSignalChannel(userId: string) {
    if (!process.client) return
    if (channel.value) return

    const ch = client.channel(`live:${userId}`)

    ch.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      console.log('[my-live] viewer-join', viewerId)

      const existing = peers.get(viewerId)
      if (existing) {
        console.log('[my-live] peer already exists for viewer', viewerId)
        return
      }

      const pc = createPeerConnection(viewerId)
      peers.set(viewerId, pc)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      ch.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          viewerId,
          sdp: pc.localDescription,
        },
      })
    })

    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      const pc = peers.get(viewerId)
      if (!pc) return

      console.log('[my-live] answer from', viewerId)
      const desc = new RTCSessionDescription(payload.sdp)
      await pc.setRemoteDescription(desc)
    })

    ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
      } catch (e) {
        console.warn('[my-live] error addIceCandidate', viewerId, e)
      }
    })

    const { status } = await ch.subscribe()
    console.log('[my-live] channel subscribe status', status)

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

  function stopCamera() {
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((t) => t.stop())
      mediaStream.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
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
      isLive.value = true
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
      if (process.client && videoEl.value) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        mediaStream.value = stream

        const v = videoEl.value
        v.srcObject = stream
        v.muted = true
        v.playsInline = true

        try {
          await v.play()
          console.log('[my-live] local video started')
        } catch (e) {
          console.warn('[my-live] local video play error', e)
        }
      } else {
        console.warn('[my-live] no video element or not client')
      }

      // помечаем в БД, что мы в эфире
      const { error } = await client
        .from('profiles')
        .update({
          is_live: true,
          live_started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] error set is_live = true:', error)
        alert('Не удалось начать эфир (ограничения доступа в Supabase).')
        stopCamera()
        stopSignalChannel()
        isLive.value = false
      } else {
        isLive.value = true
        await setupSignalChannel(id)
      }
    } catch (e) {
      console.error('[my-live] error starting live (getUserMedia):', e)
      alert('Не удалось получить доступ к камере/микрофону.')
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
        .update({ is_live: false })
        .eq('id', id)

      if (error) {
        console.error('[my-live] error set is_live = false:', error)
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