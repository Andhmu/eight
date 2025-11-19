// composables/live/useLiveNow.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

interface LiveCandidate {
  id: string
  email: string | null
  is_live: boolean
  live_started_at: string | null
}

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const candidates = ref<LiveCandidate[]>([])
  const current = ref<LiveCandidate | null>(null)
  const loading = ref(false)

  const rotationTimer = ref<number | null>(null)
  const reloadTimer = ref<number | null>(null)

  function getMyId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function loadCandidates() {
    loading.value = true

    const myId = getMyId()

    const { data, error } = await client
      .from('profiles')
      .select('id, email, is_live, live_started_at')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[live-now] loadCandidates error:', error)
      candidates.value = []
      loading.value = false
      current.value = null
      return
    }

    let list = (data ?? []) as LiveCandidate[]

    // не показываем самого себя в списке
    if (myId) {
      list = list.filter((u) => u.id !== myId)
    }

    candidates.value = list
    loading.value = false

    pickRandom()
  }

  function pickRandom() {
    const list = candidates.value
    if (!list.length) {
      current.value = null
      return
    }

    const idx = Math.floor(Math.random() * list.length)
    current.value = list[idx]
  }

  function startRotation() {
    // останавливаем, если вдруг уже крутится
    stopRotation()

    // первый запрос
    void loadCandidates()

    // просто переключаем случайного раз в 15 секунд
    rotationTimer.value = window.setInterval(() => {
      pickRandom()
    }, 15_000)

    // а список из базы обновляем, допустим, раз в минуту
    reloadTimer.value = window.setInterval(() => {
      void loadCandidates()
    }, 60_000)
  }

  function stopRotation() {
    if (rotationTimer.value !== null) {
      clearInterval(rotationTimer.value)
      rotationTimer.value = null
    }
    if (reloadTimer.value !== null) {
      clearInterval(reloadTimer.value)
      reloadTimer.value = null
    }
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  return {
    // текущий показываемый стример
    current,
    // весь список (если понадобится)
    candidates,
    loading,

    startRotation,
    stopRotation,
    reload: loadCandidates,
  }
}
