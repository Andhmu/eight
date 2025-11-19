// composables/feed/useLiveNow.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

interface LiveCandidate {
  id: string
  username: string | null
  created_at: string | null
  is_live: boolean | null
}

const candidates = ref<LiveCandidate[]>([])
const current = ref<LiveCandidate | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const rotationTimer = ref<number | null>(null)
const initialized = ref(false)

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const ROTATION_MS = 15_000

  async function loadCandidates() {
    if (loading.value) return

    loading.value = true
    error.value = null

    const raw = authUser.value as any
    const currentId: string | undefined = raw?.id ?? raw?.sub ?? undefined

    // берём только тех, кто сейчас в эфире
    let query = client
      .from('profiles')
      .select('id, username, created_at, is_live')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })
      .limit(50)

    // себя как "чужой эфир" не показываем
    if (currentId) {
      query = query.neq('id', currentId)
    }

    const { data, error: qError } = await query

    if (qError) {
      console.error('[live-now] error loading candidates:', qError)
      error.value = qError.message
      loading.value = false
      return
    }

    candidates.value = (data || []) as LiveCandidate[]
    loading.value = false
  }

  function pickRandom() {
    const list = candidates.value
    if (!list.length) {
      current.value = null
      return
    }

    const idx = Math.floor(Math.random() * list.length)
    const candidate = list[idx]

    if (!candidate) {
      current.value = null
      return
    }

    current.value = candidate
  }

  function stopRotation() {
    if (rotationTimer.value !== null) {
      clearInterval(rotationTimer.value)
      rotationTimer.value = null
    }
  }

  function startRotation() {
    stopRotation()

    pickRandom()

    if (!candidates.value.length) return

    rotationTimer.value = window.setInterval(() => {
      pickRandom()
    }, ROTATION_MS)
  }

  async function init() {
    if (initialized.value) return

    await loadCandidates()
    startRotation()
    initialized.value = true
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  return {
    current,
    loading,
    error,
    init,
  }
}