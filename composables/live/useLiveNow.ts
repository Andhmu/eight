// composables/live/useLiveNow.ts
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  live_started_at: string | null
}

export function useLiveNow() {
  const client = useSupabaseClient()

  const candidates = ref<LiveCandidate[]>([])
  const current = ref<LiveCandidate | null>(null)
  const loading = ref(false)
  const rotationTimer = ref<number | null>(null)

  async function loadCandidates() {
    loading.value = true
    const { data, error } = await client
      .from('profiles')
      .select('id, email, live_started_at')
      .eq('is_live', true)
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

    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, 60_000) // раз в минуту
  }

  return {
    candidates,
    current,
    loading,
    startRotation,
    stopRotation,
    reload: loadCandidates,
  }
}
