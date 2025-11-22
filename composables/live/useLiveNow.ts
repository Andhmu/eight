// composables/live/useLiveNow.ts
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  live_started_at: string | null
}

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const loading = ref(false)
  const candidates = ref<LiveCandidate[]>([])
  const current = ref<LiveCandidate | null>(null)
  const rotationTimer = ref<number | null>(null)

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  // ---------- загрузка списка из БД ----------

  async function loadCandidates() {
    loading.value = true
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,live_started_at,is_live')
        .eq('is_live', true)
        .order('live_started_at', { ascending: false })

      if (error) {
        console.error('[live-now] loadCandidates error', error)
        candidates.value = []
      } else {
        const me = getUserId()
        const filtered = (data || []).filter((row: any) => row.id !== me)

        candidates.value = filtered.map(
          (row: any): LiveCandidate => ({
            id: row.id,
            email: row.email ?? null,
            live_started_at: row.live_started_at ?? null,
          }),
        )
      }

      if (!candidates.value.length) {
        current.value = null
      } else if (!current.value || !candidates.value.find(c => c.id === current.value?.id)) {
        // если текущего больше нет в списке — выбираем другого
        pickRandom()
      }
    } finally {
      loading.value = false
    }
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

  // ---------- ротация карточки ----------

  function stopRotation() {
    if (rotationTimer.value !== null) {
      clearInterval(rotationTimer.value)
      rotationTimer.value = null
    }
  }

  async function startRotation() {
    if (!process.client) return

    stopRotation()
    await loadCandidates()
    if (!current.value) {
      pickRandom()
    }

    // обновляем список каждые 5 секунд,
    // чтобы карточка эфира почти сразу исчезала после завершения стрима
    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      // pickRandom() вызывается внутри loadCandidates при необходимости
    }, 5_000)
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  const hasCandidates = computed(() => !!current.value)

  return {
    loading,
    candidates,
    current,
    hasCandidates,
    loadCandidates,
    startRotation,
    stopRotation,
  }
}