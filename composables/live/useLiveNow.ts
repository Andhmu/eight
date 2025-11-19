// composables/live/useLiveNow.ts
import { ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

export interface LiveCandidate {
  id: string
  email: string | null
  display_name?: string | null
  live_started_at: string | null
}

const candidates = ref<LiveCandidate[]>([])
const current = ref<LiveCandidate | null>(null)
const loading = ref(false)
const rotationTimer = ref<number | null>(null)

function getCurrentUserId(): string | null {
  const authUser = useSupabaseUser()
  const raw = authUser.value as any
  return raw?.id ?? raw?.sub ?? null
}

async function loadCandidates() {
  if (!process.client) return

  const client = useSupabaseClient()
  loading.value = true

  const myId = getCurrentUserId()

  const { data, error } = await client
    .from('profiles')
    .select('id, email, live_started_at')
    .eq('is_live', true)

  if (error) {
    console.error('[live-now] loadCandidates error:', error)
    candidates.value = []
    current.value = null
    loading.value = false
    return
  }

  let list = (data || []) as LiveCandidate[]

  // себя из кандидатов убираем (свой эфир ты и так видишь отдельным блоком)
  if (myId) {
    list = list.filter((row) => row.id !== myId)
  }

  candidates.value = list

  // если текущий эфир отсутствует в новом списке — выбираем новый
  if (!current.value || !list.find((u) => u.id === current.value?.id)) {
    current.value = list.length ? list[0] : null
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

function startRotation() {
  if (!process.client) return
  if (rotationTimer.value !== null) return

  // первая загрузка
  void loadCandidates()

  // раз в минуту обновляем список и меняем эфир
  rotationTimer.value = window.setInterval(() => {
    pickRandom()
    void loadCandidates()
  }, 60_000)
}

function stopRotation() {
  if (rotationTimer.value !== null) {
    clearInterval(rotationTimer.value)
    rotationTimer.value = null
  }
}

export function useLiveNow() {
  return {
    candidates,
    current,
    loading,
    loadCandidates,
    startRotation,
    stopRotation,
  }
}
