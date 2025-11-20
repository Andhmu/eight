// composables/live/useMyLive.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

type LiveSignalChannel = any

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)

  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  const signalChannel = ref<LiveSignalChannel | null>(null)
  const peers = new Map<string, RTCPeerConnection>()

  function getStreamerId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function loadInitial() {
    const id = getStreamerId()
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

  function stopCamera() {
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((t) => t.stop())
      mediaStream.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
  }

  function closeAllPeers() {
    peers.forEach((pc) => pc.close())
    peers.clear()
  }

  async function stopSignalChannel() {
    if (signalChannel.value) {
      try {
        signalChannel.value.unsubscribe()
      } catch (e) {
        console.warn('[my-live] channel unsubscribe error', e)
      }
      signalChannel.value = null
    }
    closeAllPeers()
  }

  function createPeerForViewer(
    streamerId: string,
    viewerId: string,
  ): RTCPeerConnection {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    // Отправляем локальный стрим зрителю
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        peer.addTrack(track, mediaStream.value as MediaStream)
      })
    }

    // Когда у нас появляется ICE-кандидат — отправляем его зрителю
    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !signalChannel.value) return

      signalChannel.value.send({
        type: 'broadcast',
        event: 'ice',
        payload: {
          viewerId,
          candidate: ev.candidate,
        },
      })
    }

    peer.onconnectionstatechange = () => {
      console.log(
        '[my-live] peer state for viewer',
        viewerId,
        peer.connectionState,
      )
      if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected' ||
        peer.connectionState === 'closed'
      ) {
        peer.close()
        peers.delete(viewerId)
      }
    }

    peers.set(viewerId, peer)
    return peer
  }

  async function startSignalChannel(streamerId: string) {
    if (!process.client) return
    if (signalChannel.value) return

    const ch = client.channel(`live:${streamerId}`, {
      config: {
        broadcast: { self: false },
      },
    })

    // Зритель зашёл смотреть эфир
    ch.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      console.log('[my-live] viewer-join', viewerId)

      let pc = peers.get(viewerId)
      if (!pc) {
        pc = createPeerForViewer(streamerId, viewerId)
      }

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        signalChannel.value?.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            viewerId,
            sdp: offer,
          },
        })
      } catch (e) {
        console.error('[my-live] error creating offer', e)
      }
    })

    // Зритель прислал answer
    ch.on('broadcast', { event: 'viewer-answer' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      const sdp = payload.sdp
      const pc = peers.get(viewerId)
      if (!pc) {
        console.warn('[my-live] answer for unknown viewer', viewerId)
        return
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      } catch (e) {
        console.error('[my-live] error setRemoteDescription(answer)', e)
      }
    })

    // ICE-кандидаты от зрителя
    ch.on('broadcast', { event: 'viewer-ice' }, async ({ payload }) => {
      const viewerId: string = payload.viewerId
      const candidate = payload.candidate
      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('[my-live] error addIceCandidate from viewer', e)
      }
    })

    await new Promise<void>((resolve) => {
      ch.subscribe((status: string) => {
        console.log('[my-live] channel status', status)
        if (status === 'SUBSCRIBED') resolve()
      })
    })

    signalChannel.value = ch
  }

  async function startLive() {
    if (busy.value) return
    busy.value = true

    const id = getStreamerId()
    if (!id) {
      busy.value = false
      alert('Чтобы начать эфир, войдите в аккаунт.')
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
        // @ts-expect-error playsInline не в типах
        v.playsInline = true

        try {
          await v.play()
          console.log('[my-live] local video started')
        } catch (e) {
          console.warn('[my-live] video play error', e)
        }
      } else {
        console.warn('[my-live] no video element or not client')
      }

      await startSignalChannel(id)

      const { error } = await client
        .from('profiles')
        .update({
          is_live: true,
          live_started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] error set is_live = true', error)
        alert('Не удалось пометить профиль как «в эфире».')
        stopCamera()
        await stopSignalChannel()
      } else {
        isLive.value = true
      }
    } catch (e) {
      console.error('[my-live] error starting live', e)
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

    const id = getStreamerId()

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
        console.error('[my-live] error set is_live = false', error)
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