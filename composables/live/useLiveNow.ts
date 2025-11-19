
// composables/live/useLiveNow.ts
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  username: string | null
  live_started_at: string | null
  is_live: boolean
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
    const myId = getUserId()

    let query = client
      .from('profiles')
      .select('id, email, username, live_started_at, is_live')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })
      .limit(20)

    if (myId) {
      // себя из списка убираем
      query = query.neq('id', myId)
    }

    const { data, error } = await query

    if (error) {
      console.error('[live-now] loadCandidates error:', error)
      candidates.value = []
    } else {
      candidates.value = (data || []) as LiveCandidate[]
      console.log('[live-now] candidates loaded:', candidates.value)
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
    console.log('[live-now] picked:', current.value)
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

    // обновляем список и выбираем стрима раз в минуту
    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, 60_000)
  }

  async function reloadNow() {
    await loadCandidates()
    pickRandom()
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  const hasCurrent = computed(() => !!current.value)

  return {
    candidates,
    current,
    hasCurrent,
    loading,
    startRotation,
    stopRotation,
    reloadNow,
  }
}