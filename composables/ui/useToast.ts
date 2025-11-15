// composables/ui/useToast.ts

import { onBeforeUnmount, ref } from 'vue'



export function useToast(defaultDuration = 3000) {

  const visible = ref(false)

  const title = ref<string | null>(null)

  const message = ref<string | null>(null)

  const progress = ref(0)

  let timer: number | null = null



  function clearTimer() {

    if (timer) {

      clearInterval(timer)

      timer = null

    }

  }



  function showToast(

    msg: string,

    options: { title?: string; duration?: number } = {},

  ) {

    const { title: t = 'Сообщение', duration = defaultDuration } = options

    clearTimer()

    visible.value = true

    message.value = msg

    title.value = t

    progress.value = 0



    const started = Date.now()

    timer = window.setInterval(() => {

      const p = Math.min(100, ((Date.now() - started) / duration) * 100)

      progress.value = p

      if (p >= 100) {

        hideToast()

      }

    }, 40)

  }



  function hideToast() {

    clearTimer()

    visible.value = false

    progress.value = 100

  }



  onBeforeUnmount(clearTimer)



  return {

    visible,

    title,

    message,

    progress,

    showToast,

    hideToast,

  }

}