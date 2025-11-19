// composables/live/useMyLive.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveChannel = any

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  const channel = ref<LiveChannel | null>(null)
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
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // отправляем свои дорожки зрителю
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStream.value as MediaStream)
      })
    }

    // когда появились ICE-кандидаты — шлём их через Supabase
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return
      channel.value.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: {
          from: 'streamer',
          viewerId,
          candidate: ev.candidate,
        },
      })
    }

    pc.onconnectionstatechange = () => {
      console.log('[my-live] viewer', viewerId, 'pc state:', pc.connectionState)
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        peers.delete(viewerId)
      }
    }

    return pc
  }

  async function startSignalChannel(streamerId: string) {
    if (channel.value) return

    const ch = client.channel(`live:${streamerId}`, {
      config: { broadcast: { ack: true } },
    })

    // зритель подключился — создаём peer и шлём оффер
    ch.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      console.log('[my-live] viewer-join', viewerId)

      if (peers.has(viewerId)) return
      const pc = createPeerConnection(viewerId)
      peers.set(viewerId, pc)

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        channel.value?.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            viewerId,
            sdp: offer,
          },
        })
      } catch (e) {
        console.error('[my-live] error create/send offer', e)
      }
    })

    // получили answer от зрителя
    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.setRemoteDescription(
          new RTCSessionDescription(payload.sdp),
        )
      } catch (e) {
        console.error('[my-live] error setRemoteDescription(answer)', e)
      }
    })

    // ICE-кандидаты от зрителей
    ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.from !== 'viewer') return
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
      // камера + микрофон
      if (process.client && videoEl.value) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        mediaStream.value = stream

        const v = videoEl.value
        v.srcObject = stream
        v.muted = true
        // @ts-expect-error playsInline
        v.playsInline = true

        try {
          await v.play()
          console.log('[my-live] preview started')
        } catch (e) {
          console.warn('[my-live] video play error:', e)
        }
      } else {
        console.warn('[my-live] no video element or not client')
      }

      // отмечаем в профиле
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
      } else {
        isLive.value = true
        await startSignalChannel(id)
      }
    } catch (e) {
      console.error('[my-live] error starting live (getUserMedia):', e)
      alert('Не удалось получить доступ к камере/микрофону.')
      stopCamera()
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