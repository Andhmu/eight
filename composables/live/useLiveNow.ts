// composables/live/useLiveNow.ts
import { onBeforeUnmount, ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  display_name: string | null
  email: string | null
  live_started_at: string | null
}

const candidates = ref<LiveCandidate[]>([])
const current = ref<LiveCandidate | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const rotationTimer = ref<number | null>(null)

export function useLiveNow() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  function getMyId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  async function loadCandidates() {
    loading.value = true
    error.value = null

    const myId = getMyId()

    const { data, error: err } = await client
      .from('profiles')
      .select('id, display_name, email, live_started_at, is_live')
      .eq('is_live', true)
      .order('live_started_at', { ascending: false })

    if (err) {
      console.error('[live-now] loadCandidates error:', err)
      candidates.value = []
      error.value = 'Не удалось загрузить список эфиров'
    } else {
      const list = (data || []) as any[]
      // не показываем самого себя в ротации
      candidates.value = list
        .filter((row) => row.id && row.id !== myId)
        .map((row) => ({
          id: row.id as string,
          display_name: row.display_name ?? null,
          email: row.email ?? null,
          live_started_at: row.live_started_at ?? null,
        }))
    }

    loading.value = false
    pickRandom()
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

    if (!candidates.value.length) return

    // раз в минуту подбираем нового стримера
    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
    }, 60_000)
  }

  onBeforeUnmount(() => {
    stopRotation()
  })

  return {
    candidates,
    current,
    loading,
    error,
    startRotation,
    stopRotation,
    reloadNow: loadCandidates,
  }
}
