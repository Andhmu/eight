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
const reloadTimer = ref<number | null>(null)
const initialized = ref(false)

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  const ROTATION_MS = 15_000   // как часто менять ведущего
  const RELOAD_MS = 10_000     // как часто заново спрашивать Supabase

  async function loadCandidates() {
    loading.value = true
    error.value = null

    const raw = authUser.value as any
    const currentId: string | undefined = raw?.id ?? raw?.sub ?? undefined

    let query = client
      .from('profiles')
      .select('id, username, created_at, is_live')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })
      .limit(50)

    if (currentId) {
      query = query.neq('id', currentId)
    }

    const { data, error: qError } = await query

    if (qError) {
      console.error('[live-now] error loading candidates:', qError)
      error.value = qError.message
      loading.value = false
      candidates.value = []
      current.value = null
      return
    }

    candidates.value = (data || []) as LiveCandidate[]

    // Если текущий ведущий исчез — выберем нового
    if (!current.value || !candidates.value.some(c => c.id === current.value?.id)) {
      pickRandom()
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

  function stopReload() {
    if (reloadTimer.value !== null) {
      clearInterval(reloadTimer.value)
      reloadTimer.value = null
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
    initialized.value = true

    await loadCandidates()
    startRotation()

    // периодически перезагружаем список из Supabase
    reloadTimer.value = window.setInterval(async () => {
      await loadCandidates()
      // если кто-то появился — запустим/обновим ротацию
      startRotation()
    }, RELOAD_MS)
  }

  onBeforeUnmount(() => {
    stopRotation()
    stopReload()
  })

  return {
    current,
    loading,
    error,
    init,
  }
}
