// composables/live/useMyLive.ts
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  // --- вспомогательные функции ---

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

  // --- начальное состояние ---

  async function loadInitial() {
    const id = getUserId()
    if (!id) return

    const { data, error } = await client
      .from('profiles')
      .select('is_live')
      .eq('id', id)
      .maybeSingle()

    if (!error && data?.is_live) {
      // если в базе помечено, что мы в эфире — локально тоже включим флаг
      isLive.value = true
    }
  }

  // --- запуск эфира ---

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
      // 1. Локально включаем флаг, чтобы Vue отрисовал <video ref="videoEl">
      isLive.value = true

      // ждём, пока DOM обновится и видео реально появится
      if (process.client) {
        await nextTick()

        const v = videoEl.value
        if (v) {
          // 2. Просим доступ к камере/микрофону
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })

          mediaStream.value = stream
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
          console.warn('[my-live] video element not found after nextTick')
        }
      }

      // 3. Отмечаем в Supabase, что мы в эфире
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
        // откатываем локальное состояние
        isLive.value = false
        stopCamera()
      }
    } catch (e) {
      console.error('[my-live] error starting live (getUserMedia):', e)
      alert('Не удалось получить доступ к камере/микрофону.')
      isLive.value = false
      stopCamera()
    } finally {
      busy.value = false
    }
  }

  // --- остановка эфира ---

  async function stopLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()

    // сразу выключаем камеру локально
    stopCamera()

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
