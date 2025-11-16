// composables/coins/useCoins.ts

import { computed, onBeforeUnmount, ref } from 'vue'



const coins = ref(0)

const loading = ref(false)

const currentUserId = ref<string | null>(null)



let timer: number | null = null

let lastSync = 0



export function useCoins() {

  const client = useSupabaseClient()



  async function fetchOrCreate() {

    const userId = currentUserId.value

    if (!userId) return



    loading.value = true

    console.log('[coins] fetchOrCreate for user', userId)



    const { data, error } = await client

      .from('user_coins')

      .select('coins')

      .eq('user_id', userId)

      .maybeSingle()



    if (error) {

      console.error('[coins] error loading:', error)

      coins.value = 0

    } else if (data) {

      coins.value = Number(data.coins) || 0

    } else {

      coins.value = 0

      const { error: insertError } = await client

        .from('user_coins')

        .insert({

          user_id: userId,

          coins: 0,

        })



      if (insertError) {

        console.error('[coins] error creating row:', insertError)

      } else {

        console.log('[coins] created new row with 0 coins')

      }

    }



    loading.value = false

  }



  async function saveCoins() {

    const userId = currentUserId.value

    if (!userId) return



    console.log('[coins] saveCoins', coins.value)



    const { error } = await client

      .from('user_coins')

      .upsert({

        user_id: userId,

        coins: coins.value,

        updated_at: new Date().toISOString(),

      })



    if (error) {

      console.error('[coins] error saving:', error)

    }

  }



  function stopTimer() {

    if (timer) {

      console.log('[coins] stopTimer')

      clearInterval(timer)

      timer = null

    }

  }



  function startTimer() {

    if (!process.client) return

    if (!currentUserId.value) return

    if (timer) return



    console.log('[coins] startTimer')

    lastSync = Date.now()



    timer = window.setInterval(() => {

      coins.value += 1



      const now = Date.now()

      if (now - lastSync > 10_000) {

        lastSync = now

        void saveCoins()

      }

    }, 1000)

  }



  // Инициализация для конкретного пользователя

  async function initForUser(userId: string) {

    console.log('[coins] initForUser', userId)

    currentUserId.value = userId

    stopTimer()

    await fetchOrCreate()

    startTimer()

  }



  // Сброс, когда пользователь вышел

  function reset() {

    console.log('[coins] reset')

    stopTimer()

    currentUserId.value = null

    coins.value = 0

  }



  onBeforeUnmount(() => {

    stopTimer()

    void saveCoins()

  })



  const displayCoins = computed(() => coins.value)



  return {

    coins: displayCoins,

    loading,

    initForUser,

    reset,

    startTimer,

    stopTimer,

    saveCoins,

  }

}