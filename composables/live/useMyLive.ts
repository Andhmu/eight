// composables/live/useMyLive.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  // WebRTC + сигнальный канал через Supabase Realtime
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

    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        if (mediaStream.value) {
          peer.addTrack(track, mediaStream.value)
        }
      })
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
      if (
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'failed' ||
        peer.connectionState === 'closed'
      ) {
        peer.close()
        peers.delete(viewerId)
      }
    }

    return peer
  }

  async function startSignalChannel(streamerId: string) {
    const ch = client.channel(`live:${streamerId}`)

    // зритель подключился — создаём предложение
    ch.on('broadcast', { event: 'viewer-join' }, async (payload) => {
      const viewerId: string = payload.viewerId
      if (!viewerId) return

      let peer = peers.get(viewerId)
      if (!peer) {
        peer = createPeerConnection(viewerId)
        peers.set(viewerId, peer)
      }

      try {
        const offer = await peer.createOffer()
        await peer.setLocalDescription(offer)

        ch.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            viewerId,
            sdp: offer,
          },
        })
      } catch (e) {
        console.error('[my-live] error creating offer:', e)
      }
    })

    // ответ зрителя
    ch.on('broadcast', { event: 'answer' }, async (payload) => {
      const viewerId: string = payload.viewerId
      const peer = peers.get(viewerId)
      if (!peer) return
      try {
        await peer.setRemoteDescription(
          new RTCSessionDescription(payload.sdp),
        )
      } catch (e) {
        console.error('[my-live] error setRemoteDescription(answer):', e)
      }
    })

    // ICE-кандидаты от зрителей
    ch.on('broadcast', { event: 'ice-candidate' }, async (payload) => {
      const viewerId: string = payload.viewerId
      const peer = peers.get(viewerId)
      if (!peer) return
      try {
        await peer.addIceCandidate(
          new RTCIceCandidate(payload.candidate),
        )
      } catch (e) {
        console.error('[my-live] error addIceCandidate:', e)
      }
    })

    const { status } = await ch.subscribe()
    console.log('[my-live] channel subscribe status:', status)

    channel.value = ch
  }

  async function stopSignalChannel() {
    if (channel.value) {
      try {
        await channel.value.unsubscribe()
      } catch (e) {
        console.warn('[my-live] error unsubscribe channel:', e)
      }
      channel.value = null
    }
    peers.forEach((pc) => pc.close())
    peers.clear()
  }

  // подтягиваем флаг is_live при заходе
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
      // включаем камеру/микрофон
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
          console.log('[my-live] video started')
        } catch (e) {
          console.warn('[my-live] video play error:', e)
        }
      } else {
        console.warn('[my-live] no video element or not client', {
          client: process.client,
          videoEl: videoEl.value,
        })
      }

      // отмечаем в профиле, что в эфире
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
        await stopSignalChannel()
      } else {
        await startSignalChannel(id)
        isLive.value = true
      }
    } catch (e) {
      console.error('[my-live] error starting live (getUserMedia):', e)
      alert('Не удалось получить доступ к камере/микрофону.')
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
      const { error } = await client
        .from('profiles')
        .update({
          is_live: false,
        })
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