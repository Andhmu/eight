// composables/live/useLiveNow.ts
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  created_at: string | null
  live_started_at: string | null
}

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const candidates = ref<LiveCandidate[]>([])
  const current = ref<LiveCandidate | null>(null)
  const loading = ref(false)

  const rotationTimer = ref<number | null>(null)

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function loadCandidates() {
    loading.value = true
    const me = getUserId()

    const { data, error } = await client
      .from('profiles')
      .select('id, email, created_at, live_started_at')
      .eq('is_live', true)
      .neq('id', me ?? '______') // чтобы себя не видеть
      .order('live_started_at', { ascending: false })

    if (error) {
      console.error('[live-now] loadCandidates error', error)
      candidates.value = []
    } else {
      candidates.value = (data || []) as LiveCandidate[]
    }

    loading.value = false
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
    pickRandom()

    if (!candidates.value.length) return

    // если только один стример: обновляем список раз в 2 минуты
    const intervalMs =
      candidates.value.length === 1 ? 120_000 : 60_000

    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, intervalMs)
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  const currentLive = computed(() => current.value)

  return {
    candidates,
    currentLive,
    loading,
    reload: loadCandidates,
    startRotation,
    stopRotation,
  }
}
