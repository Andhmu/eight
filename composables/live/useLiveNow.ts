// composables/live/useLiveNow.ts
import { ref } from 'vue'
import { useSupabaseClient } from '#imports'

export interface LiveCandidate {
  id: string
  email: string
  display_name: string | null
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
      .select('id, email, live_started_at, display_name, is_live')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })

    if (error) {
      console.error('[live-now] loadCandidates error', error)
      candidates.value = []
      current.value = null
    } else {
      candidates.value = (data ?? []) as LiveCandidate[]
      if (!candidates.value.length) {
        current.value = null
      } else if (!current.value) {
        pickRandom()
      }
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
    if (rotationTimer.value != null) {
      clearInterval(rotationTimer.value)
      rotationTimer.value = null
    }
  }

  async function startRotation() {
    if (!process.client) return

    stopRotation()
    await loadCandidates()

    // если только один стример — просто иногда обновляем список,
    // если несколько — каждые 60 сек переключаем случайного
    if (candidates.value.length <= 1) {
      rotationTimer.value = window.setInterval(loadCandidates, 120_000)
    } else {
      rotationTimer.value = window.setInterval(() => {
        pickRandom()
      }, 60_000)
    }
  }

  return {
    candidates,
    current,
    loading,
    loadCandidates,
    startRotation,
    stopRotation,
  }
}
