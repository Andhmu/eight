// composables/live/useLiveNow.ts
import { computed, onBeforeUnmount, ref } from 'vue'
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
  const rotationTimer = ref<number | null>(null)

  // канал для realtime-изменений профилей
  const changesChannel = ref<ReturnType<typeof client.channel> | null>(null)

  function getUserId(): string | null {
    const raw = authUser.value as any
    return raw?.id ?? raw?.sub ?? null
  }

  // ---------- загрузка списка из БД ----------

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

  // ---------- realtime-обновление списка ----------

  function applyProfileLiveChange(rowNew: any | null, rowOld: any | null) {
    const me = getUserId()
    const id = rowNew?.id ?? rowOld?.id
    if (!id || id === me) return

    const wasLive = rowOld?.is_live ?? false
    const isLive = rowNew?.is_live ?? false

    // состояние "в эфире" не изменилось — ничего не делаем
    if (wasLive === isLive) return

    if (isLive) {
      // кто-то вышел в эфир — добавляем/обновляем в списке
      const idx = candidates.value.findIndex((c) => c.id === id)
      const candidate: LiveCandidate = {
        id,
        email: rowNew.email ?? null,
        live_started_at: rowNew.live_started_at ?? null,
      }
      if (idx === -1) {
        candidates.value.push(candidate)
      } else {
        candidates.value[idx] = candidate
      }
      // можно обновить current — пусть иногда подхватывает новый эфир
      if (!current.value) {
        pickRandom()
      }
    } else {
      // кто-то завершил эфир — убираем из списка
      const idx = candidates.value.findIndex((c) => c.id === id)
      if (idx !== -1) {
        candidates.value.splice(idx, 1)
      }
      if (current.value?.id === id) {
        pickRandom() // выберем другого или очистим current
      }
    }
  }

  async function startRealtime() {
    if (changesChannel.value) return

    const ch = client.channel('live-now-profiles')

    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      (payload: any) => {
        // нас интересует только смена is_live
        applyProfileLiveChange(payload.new, payload.old)
      },
    )

    await ch.subscribe((status) => {
      console.log('[live-now] realtime status', status)
    })

    changesChannel.value = ch
  }

  function stopRealtime() {
    if (changesChannel.value) {
      console.log('[live-now] stop realtime')
      changesChannel.value.unsubscribe()
      changesChannel.value = null
    }
  }

  // ---------- ротация карточки ----------

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
    await startRealtime()

    rotationTimer.value = window.setInterval(async () => {
      await loadCandidates()
      pickRandom()
    }, 60_000)
  }

  onBeforeUnmount(() => {
    stopRotation()
    stopRealtime()
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