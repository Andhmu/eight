// composables/live/useMyLive.ts

import { nextTick, onBeforeUnmount, ref } from 'vue'

import { useSupabaseClient, useSupabaseUser } from '#imports'

import { useLiveMedia } from './useLiveMedia'

import { useLiveStreamerSignal } from './useLiveStreamerSignal'



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

    } else {

      isLive.value = false

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



    console.log('[my-live] startLive')



    try {

      // 1. включаем UI, чтобы появился <video>

      isLive.value = true

      if (process.client) {

        await nextTick()

      }



      // 2. запускаем камеру

      await startCamera()



      // 3. включаем signaling канал

      await ensureSignalChannel(id)



      // 4. отмечаем профиль как «в эфире»

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

  }

}