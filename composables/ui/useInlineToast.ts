// composables/ui/useInlineToast.ts
import { ref, onBeforeUnmount } from 'vue'

export function useInlineToast(defaultTitle = 'Ошибка', defaultDuration = 3000) {
  const toastMessage = ref('')
  const toastTitle = ref(defaultTitle)
  const toastProgress = ref(0)

  let timer: number | null = null

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function showToast(message: string, title = defaultTitle, ms = defaultDuration) {
    toastTitle.value = title
    toastMessage.value = message
    toastProgress.value = 0
    clearTimer()

    const started = Date.now()
    timer = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / ms) * 100)
      toastProgress.value = p
      if (p >= 100) hideToast()
    }, 40)
  }

  function hideToast() {
    toastMessage.value = ''
    toastTitle.value = ''
    toastProgress.value = 100
    clearTimer()
  }

  onBeforeUnmount(clearTimer)

  return { toastMessage, toastTitle, toastProgress, showToast, hideToast }
}