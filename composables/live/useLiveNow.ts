// composables/live/useLiveNow.ts
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import type { LiveCandidate } from './liveTypes'

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

    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, 60_000)
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
