// composables/live/useMyLive.ts
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

/**
 * Логика "я стример":
 * - включает/выключает камеру
 * - пишет is_live / live_started_at в public.profiles
 * - отдаёт ref на <video> для локального предпросмотра
 */
export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)

  // ref на <video>, который ВЕЗДЕ будет один и тот же
  const videoEl = ref<HTMLVideoElement | null>(null)
  const mediaStream = ref<MediaStream | null>(null)

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
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

  function stopCamera() {
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach((t) => t.stop())
      mediaStream.value = null
    }
    if (videoEl.value) {
      videoEl.value.srcObject = null
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
      // гарантируем, что <video> уже есть в DOM
      await nextTick()

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
          console.log('[my-live] video started')
        } catch (e) {
          console.warn('[my-live] video play error:', e)
        }
      } else {
        console.warn('[my-live] no video element or not client', {
          client: process.client,
          videoEl: videoEl.value,
        })
      }

      // отмечаем в Supabase, что мы в эфире
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
