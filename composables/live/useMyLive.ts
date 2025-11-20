// composables/live/useMyLive.ts
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  // состояние
  const isLive = ref(false)
  const busy = ref(false)

  // сюда из компонента привязывается <video>
  const videoEl = ref<HTMLVideoElement | null>(null)

  // текущий MediaStream (камера+микрофон)
  const mediaStream = ref<MediaStream | null>(null)

  // --- вспомогалки ---

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

  // подтягиваем is_live при заходе на страницу
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

  // --- старт эфира ---

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
      // 1. сразу считаем, что мы "в эфире",
      // чтобы отрендерился блок с <video>
      isLive.value = true

      if (process.client) {
        // ждём, пока Vue смонтирует <video ref="videoEl">
        await nextTick()

        if (videoEl.value) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })

          mediaStream.value = stream

          const v = videoEl.value
          v.srcObject = stream
          v.muted = true
          // @ts-expect-error playsInline нет в типах, но в браузере есть
          v.playsInline = true

          try {
            await v.play()
            console.log('[my-live] video started')
          } catch (e) {
            console.warn('[my-live] video play error:', e)
          }
        } else {
          console.warn('[my-live] no video element after nextTick', {
            client: process.client,
            videoEl: videoEl.value,
          })
        }
      } else {
        console.warn('[my-live] startLive called on server side')
      }

      // 2. помечаем в Supabase, что мы в эфире
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
        // откатываем состояние
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

  // --- стоп эфира ---

  async function stopLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()

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
