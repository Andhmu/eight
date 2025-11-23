// composables/live/useLiveNow.ts
import { computed, ref } from 'vue'
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

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function refreshCandidates() {
    loading.value = true
    try {
      const { data, error } = await client
        .from('profiles')
        .select('id,email,live_started_at,is_live')
        .eq('is_live', true)
        .order('live_started_at', { ascending: false })

      if (error) {
        console.error('[live-now] refreshCandidates error', error)
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
      } else if (
        current.value &&
        !candidates.value.find((c) => c.id === current.value?.id)
      ) {
        // текущего больше нет в списке — выбираем нового
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

  const hasCandidates = computed(() => candidates.value.length > 0)
  const hasMultipleCandidates = computed(() => candidates.value.length > 1)

  return {
    loading,
    candidates,
    current,
    hasCandidates,
    hasMultipleCandidates,
    refreshCandidates,
    pickRandom,
  }
}
