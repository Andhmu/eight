// composables/live/useLiveNow.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  display_name: string | null
  live_started_at: string | null
}

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const candidates = ref<LiveCandidate[]>([])
  const current = ref<LiveCandidate | null>(null)
  const loading = ref(false)

  const rotationTimer = ref<number | null>(null)

  function getMyId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function loadCandidates() {
    loading.value = true
    const myId = getMyId()

    const { data, error } = await client
      .from('profiles')
      .select('id, email, display_name, live_started_at')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })

    if (error) {
      console.error('[live-now] loadCandidates error', error)
      candidates.value = []
      current.value = null
      loading.value = false
      return
    }

    let list = (data || []) as LiveCandidate[]

    // убираем себя из списка зрителя
    if (myId) {
      list = list.filter((u) => u.id !== myId)
    }

    candidates.value = list
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

    const intervalMs = candidates.value.length > 1 ? 60_000 : 120_000

    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, intervalMs)
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  return {
    candidates,
    current,
    loading,
    startRotation,
    stopRotation,
    refresh: loadCandidates,
  }
}