// composables/live/useLiveStreamerSignal.ts
import { ref, type Ref } from 'vue'
import { useSupabaseClient } from '#imports'
import type { LiveSignalPayload } from './liveTypes'

export function useLiveStreamerSignal(mediaStream: Ref<MediaStream | null>) {
  const client = useSupabaseClient()
  const channel = ref<ReturnType<typeof client.channel> | null>(null)
  const peers = new Map<string, RTCPeerConnection>()

  function createPeerConnection(viewerId: string): RTCPeerConnection {
    console.log('[my-live] createPeerConnection for', viewerId)

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })

    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((track) => {
        if (mediaStream.value) {
          pc.addTrack(track, mediaStream.value)
        }
      })
      console.log('[my-live] tracks added for', viewerId)
    } else {
      console.warn('[my-live] no mediaStream when creating pc for', viewerId)
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !channel.value) return

      console.log('[my-live] send ICE to viewer', viewerId)
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

  async function ensureSignalChannel(streamerId: string) {
    if (channel.value) return

    console.log('[my-live] ensureSignalChannel for', streamerId)

    const ch = client.channel(`live-${streamerId}`, {
      config: {
        broadcast: { self: false },
      },
    })

    // ЗРИТЕЛЬ ПОДКЛЮЧИЛСЯ
    ch.on('broadcast', { event: 'viewer-join' }, async (message: any) => {
      try {
        console.log('[my-live] viewer-join raw message', message)
        const payload = (message as { payload: LiveSignalPayload }).payload
        const viewerId = (payload as any)?.viewerId as string | undefined
        if (!viewerId) {
          console.warn('[my-live] viewer-join without viewerId')
          return
        }

        console.log('[my-live] viewer-join from', viewerId)

        const pc = createPeerConnection(viewerId)
        peers.set(viewerId, pc)

        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        console.log('[my-live] send offer to', viewerId)
        ch.send({
          type: 'broadcast',
          event: 'offer',
          payload: { viewerId, offer },
        })
      } catch (e) {
        console.error('[my-live] error on viewer-join:', e)
      }
    })

    // ПОЛУЧИЛИ ANSWER ОТ ЗРИТЕЛЯ
    ch.on('broadcast', { event: 'answer' }, async (message: any) => {
      console.log('[my-live] raw answer message', message)
      const payload = (message as { payload: LiveSignalPayload }).payload as any
      const viewerId = payload?.viewerId
      const answer = payload?.answer
      if (!viewerId || !answer) return

      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        console.log('[my-live] got answer from', viewerId)
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (e) {
        console.error('[my-live] error apply answer:', e)
      }
    })

    // ICE ОТ ЗРИТЕЛЯ
    ch.on('broadcast', { event: 'ice-candidate' }, async (message: any) => {
      const payload = (message as { payload: LiveSignalPayload }).payload as any
      const viewerId = payload?.viewerId
      const candidate = payload?.candidate
      if (!viewerId || !candidate) return

      const pc = peers.get(viewerId)
      if (!pc) return

      try {
        console.log('[my-live] add ICE from viewer', viewerId)
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

  function notifyStreamEnded() {
    if (!channel.value) return
    console.log('[my-live] broadcast stream-ended')

    channel.value.send({
      type: 'broadcast',
      event: 'stream-ended',
      payload: {},
    })
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

  return {
    channel,
    peers,
    ensureSignalChannel,
    stopSignalChannel,
    notifyStreamEnded,
  }
}
