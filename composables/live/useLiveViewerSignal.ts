// composables/live/useLiveViewerSignal.ts
import { ref, type Ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { LiveSignalPayload } from './liveTypes'

type ViewerStatus = 'idle' | 'connecting' | 'playing' | 'reconnecting' | 'error'

interface ViewerStats {
  bitrateKbps: number | null
  rttMs: number | null
}

export function useLiveViewerSignal(videoEl: Ref<HTMLVideoElement | null>) {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isWatching = ref(false)
  const streamerId = ref<string | null>(null)
  const viewerId = ref<string | null>(null)

  const channel = ref<ReturnType<typeof client.channel> | null>(null)
  const pc = ref<RTCPeerConnection | null>(null)

  const status = ref<ViewerStatus>('idle')
  const statusMessage = ref<string>('')

  const stats = ref<ViewerStats | null>(null)

  // простая защита от бесконечных попыток
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 3

  const shouldMuteOnNextAttach = ref(false)

  let statsTimer: number | null = null
  let lastBytesReceived = 0
  let lastTimestamp = 0

  function getViewerId(): string {
    const raw = authUser.value as any
    const id: string | undefined = raw?.id ?? raw?.sub ?? undefined
    if (id) return id
    return 'anon-' + Math.random().toString(36).slice(2)
  }

  async function attachRemoteStream(stream: MediaStream) {
    if (!videoEl.value) {
      console.warn('[viewer] no video element to attach stream')
      return
    }

    const v = videoEl.value
    v.srcObject = stream
    ;(v as any).playsInline = true
    v.autoplay = true

    if (shouldMuteOnNextAttach.value) {
      v.muted = true
      shouldMuteOnNextAttach.value = false
    } else {
      v.muted = false
    }

    try {
      await v.play()
      console.log('[viewer] video element playing')
      status.value = 'playing'
      statusMessage.value = 'Эфир воспроизводится'
    } catch (e) {
      console.warn('[viewer] video play error:', e)
      status.value = 'error'
      statusMessage.value =
        'Видео не удалось запустить автоматически. Нажмите Play в плеере.'
    }
  }

  function startStats() {
    if (!process.client) return

    if (statsTimer !== null) {
      clearInterval(statsTimer)
      statsTimer = null
    }

    lastBytesReceived = 0
    lastTimestamp = 0
    stats.value = null

    statsTimer = window.setInterval(async () => {
      if (!pc.value) return

      try {
        const report = await pc.value.getStats()
        let videoStats: any = null

        report.forEach((s: any) => {
          if (s.type === 'inbound-rtp' && s.kind === 'video') {
            videoStats = s
          }
        })

        if (!videoStats) return

        const bytes = videoStats.bytesReceived ?? 0
        const ts = videoStats.timestamp ?? 0

        if (lastTimestamp && ts > lastTimestamp) {
          const deltaBytes = bytes - lastBytesReceived
          const deltaTimeSec = (ts - lastTimestamp) / 1000
          const bitrateKbps =
            deltaTimeSec > 0
              ? Math.round(((deltaBytes * 8) / 1000) / deltaTimeSec)
              : 0

          const rttMs =
            typeof videoStats.roundTripTime === 'number'
              ? Math.round(videoStats.roundTripTime * 1000)
              : null

          stats.value = {
            bitrateKbps,
            rttMs,
          }
        }

        lastBytesReceived = bytes
        lastTimestamp = ts
      } catch (e) {
        console.warn('[viewer] getStats error:', e)
      }
    }, 2000)
  }

  function stopStats() {
    if (statsTimer !== null) {
      clearInterval(statsTimer)
      statsTimer = null
    }
    stats.value = null
    lastBytesReceived = 0
    lastTimestamp = 0
  }

  function scheduleReconnect(reason: string) {
    if (!isWatching.value || !streamerId.value) return
    if (reconnectAttempts.value >= maxReconnectAttempts) {
      console.warn('[viewer] reconnect attempts limit reached')
      status.value = 'error'
      statusMessage.value =
        'Не удалось переподключиться к эфиру. Попробуйте обновить трансляцию.'
      return
    }

    reconnectAttempts.value++
    shouldMuteOnNextAttach.value = true

    status.value = 'reconnecting'
    statusMessage.value = 'Стример перезапускает эфир… Подключаемся снова'

    console.log(
      '[viewer] schedule reconnect, reason =',
      reason,
      'attempt',
      reconnectAttempts.value,
    )

    setTimeout(() => {
      if (!isWatching.value || !streamerId.value) return
      // новая попытка подключиться к тому же стримеру
      void openForStreamer(streamerId.value)
    }, 1000)
  }

  function createPeerConnection(): RTCPeerConnection {
    console.log('[viewer] createPeerConnection')

    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    peer.ontrack = (ev) => {
      const [remoteStream] = ev.streams
      console.log('[viewer] ontrack fired, streams:', ev.streams.length)
      if (remoteStream) {
        void attachRemoteStream(remoteStream)
      }
    }

    peer.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value || !viewerId.value) return

      console.log('[viewer] send ICE to streamer')
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

      const state = peer.connectionState
      if (['disconnected', 'failed'].includes(state)) {
        // если стример перезагрузился, соединение рвётся – пробуем переподключиться
        scheduleReconnect(state)
      }
    }

    return peer
  }

  function stopPeer() {
    if (pc.value) {
      console.log('[viewer] close peer connection')
      pc.value.close()
      pc.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
    stopStats()
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

    // новая явная попытка просмотра — сбрасываем счётчик
    reconnectAttempts.value = 0
    status.value = 'connecting'
    statusMessage.value = 'Подключаемся к эфиру…'

    stopPeer()
    stopSignalChannel()

    streamerId.value = id
    viewerId.value = getViewerId()

    const ch = client.channel(`live-${id}`, {
      config: { broadcast: { self: false } },
    })

    // ПОЛУЧИЛИ OFFER ОТ СТРИМЕРА
    ch.on('broadcast', { event: 'offer' }, async (message: any) => {
      const wrapper = message as { payload: LiveSignalPayload }
      const payload = wrapper.payload as any
      console.log('[viewer] got offer raw', message)

      const vId = payload?.viewerId
      const offer = payload?.offer
      if (vId !== viewerId.value || !offer) {
        console.log('[viewer] offer ignored, viewerId mismatch или нет offer')
        return
      }

      console.log('[viewer] handling offer from streamer')

      if (!pc.value) {
        pc.value = createPeerConnection()
      }

      try {
        await pc.value.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.value.createAnswer()
        await pc.value.setLocalDescription(answer)

        console.log('[viewer] send answer to streamer')
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
        status.value = 'error'
        statusMessage.value =
          'Ошибка при обработке ответа от стримера. Попробуйте обновить трансляцию.'
      }
    })

    // ICE ОТ СТРИМЕРА
    ch.on('broadcast', { event: 'ice-candidate' }, async (message: any) => {
      const payload = (message as { payload: LiveSignalPayload }).payload as any
      const vId = payload?.viewerId
      const candidate = payload?.candidate
      if (vId !== viewerId.value || !candidate) {
        return
      }
      if (!pc.value) {
        console.warn('[viewer] got ICE but no pc')
        return
      }

      console.log('[viewer] add ICE from streamer')
      try {
        await pc.value.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.warn('[viewer] error add ICE from streamer:', e)
      }
    })

    await ch.subscribe((statusVal) => {
      console.log('[viewer] channel status', statusVal)
    })

    channel.value = ch
    pc.value = createPeerConnection()
    startStats()

    console.log('[viewer] viewer-join sent')
    ch.send({
      type: 'broadcast',
      event: 'viewer-join',
      payload: { viewerId: viewerId.value },
    })

    isWatching.value = true
  }

  function closeViewer() {
    console.log('[viewer] closeViewer')
    isWatching.value = false
    streamerId.value = null
    reconnectAttempts.value = 0
    status.value = 'idle'
    statusMessage.value = ''

    stopPeer()
    stopSignalChannel()
  }

  return {
    isWatching,
    openForStreamer,
    closeViewer,
    status,
    statusMessage,
    stats,
  }
}