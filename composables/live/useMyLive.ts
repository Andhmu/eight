// composables/live/useMyLive.ts
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useLiveMedia } from './useLiveMedia'
import { useLiveStreamerSignal } from './useLiveStreamerSignal'

interface LoadInitialOptions {
  autoResume?: boolean
}

export function useMyLive() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const isLive = ref(false)
  const busy = ref(false)

  const { videoEl, mediaStream, startCamera, stopCamera } = useLiveMedia()
  const { ensureSignalChannel, stopSignalChannel } = useLiveStreamerSignal(mediaStream)

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  // ---------- восстановление эфира после перезагрузки ----------

  async function resumeLiveAfterReload() {
    if (busy.value) return
    const id = getUserId()
    if (!id) {
      isLive.value = false
      return
    }

    console.log('[my-live] resumeLiveAfterReload')

    busy.value = true
    try {
      isLive.value = true
      if (process.client) {
        await nextTick()
      }

      await startCamera()
      await ensureSignalChannel(id)
    } catch (e) {
      console.error('[my-live] resumeLiveAfterReload error:', e)
      stopCamera()
      stopSignalChannel()
      isLive.value = false
    } finally {
      busy.value = false
    }
  }

  // ---------- начальная загрузка состояния из профиля ----------

  async function loadInitial(options: LoadInitialOptions = {}) {
    const { autoResume = false } = options

    const id = getUserId()
    if (!id) return

    const { data, error } = await client
      .from('profiles')
      .select('is_live')
      .eq('id', id)
      .maybeSingle()

    if (!error && data?.is_live) {
      console.log('[my-live] loadInitial: profile is_live = true')
      isLive.value = true

      if (autoResume && process.client) {
        // Восстанавливаем камеру и канал только на клиенте
        await resumeLiveAfterReload()
      }
    } else {
      console.log('[my-live] loadInitial: profile is_live = false')
      isLive.value = false
    }
  }

  // ---------- явный старт/стоп эфира по кнопкам ----------

  async function startLive() {
    if (busy.value) return
    busy.value = true

    const id = getUserId()
    if (!id) {
      busy.value = false
      alert('Чтобы начать эфир, нужно войти в аккаунт.')
      return
    }

    console.log('[my-live] startLive')

    try {
      isLive.value = true
      if (process.client) {
        await nextTick()
      }

      await startCamera()
      await ensureSignalChannel(id)

      const { error } = await client
        .from('profiles')
        .update({
          is_live: true,
          live_started_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] set is_live=true error:', error)
        alert('Не удалось пометить профиль как «в эфире».')
        stopCamera()
        stopSignalChannel()
        isLive.value = false
      }
    } catch (e) {
      console.error('[my-live] startLive error:', e)
      alert('Не удалось запустить трансляцию.')
      stopCamera()
      stopSignalChannel()
      isLive.value = false
    } finally {
      busy.value = false
    }
  }

  async function stopLive() {
    if (busy.value) return
    busy.value = true

    console.log('[my-live] stopLive')

    const id = getUserId()

    stopCamera()
    stopSignalChannel()

    if (id) {
      const { error } = await client
        .from('profiles')
        .update({
          is_live: false,
        })
        .eq('id', id)

      if (error) {
        console.error('[my-live] set is_live=false error:', error)
      }
    }

    isLive.value = false
    busy.value = false
  }

  onBeforeUnmount(() => {
    stopCamera()
    stopSignalChannel()
  })

  return {
    isLive,
    busy,
    videoEl,
    loadInitial,
    startLive,
    stopLive,
    resumeLiveAfterReload,
  }
}