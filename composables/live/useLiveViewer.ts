// composables/live/useLiveViewer.ts
import { onBeforeUnmount, ref } from 'vue'
import { useLiveViewerSignal } from './useLiveViewerSignal'

export function useLiveViewer() {
  const videoEl = ref<HTMLVideoElement | null>(null)

  const {
    isWatching,
    openForStreamer,
    closeViewer,
  } = useLiveViewerSignal(videoEl)

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