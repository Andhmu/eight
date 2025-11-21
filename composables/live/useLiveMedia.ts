// composables/live/useLiveMedia.ts
import { ref } from 'vue'

export function useLiveMedia() {
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  async function startCamera() {
    if (!process.client) return
    console.log('[live-media] startCamera called')

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    })

    mediaStream.value = stream

    if (videoEl.value) {
      const v = videoEl.value
      v.srcObject = stream
      v.muted = true
      ;(v as any).playsInline = true

      try {
        await v.play()
        console.log('[live-media] local video started')
      } catch (e) {
        console.warn('[live-media] video play error:', e)
      }
    } else {
      console.warn('[live-media] no video element for local preview')
    }
  }

  function stopCamera() {
    console.log('[live-media] stopCamera')
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((t) => t.stop())
      mediaStream.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
    }
  }

  return {
    videoEl,
    mediaStream,
    startCamera,
    stopCamera,
  }
}