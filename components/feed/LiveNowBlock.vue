<!-- FILE: components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <!-- Холо-шапка -->
    <LiveHeader
      :is-live="isLive"
      :busy="busy"
      @start="onStartClick"
      @switchCamera="onSwitchCameraClick"
    />

    <div class="feed-card__body live-card__body">
      <!-- Свой эфир -->
      <LiveMyStreamPanel
        v-if="isLive"
        :busy="busy"
        :set-video-el="setMyVideoEl"
        @switchCamera="onSwitchCameraClick"
        @stopLive="stopLive"
      />

      <!-- Превью чужих эфиров / плейсхолдер -->
      <LivePreviewBlock
        v-else
        :current="current"
        :show-slot="showSlot"
        :placeholder-text="placeholderText"
        :set-preview-video-el="setPreviewVideoEl"
        @openViewer="openViewer"
      />
    </div>

    <!-- Выезжающая панель для просмотра эфира -->
    <LiveViewerDrawer
      :is-open="viewerOpen"
      :current-email="current?.email || null"
      :status-message="viewerStatusMessage"
      :stats="viewerStats"
      :set-video-el="setViewerVideoEl"
      @close="closeViewer"
      @refresh="refreshViewer"
    />
  </section>
</template>

<script setup lang="ts">
// FILE: components/feed/LiveNowBlock.vue
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'
import { useLivePreview } from '~/composables/live/useLivePreview'

import LiveHeader from '~/components/feed/live/LiveHeader.vue'
import LiveMyStreamPanel from '~/components/feed/live/LiveMyStreamPanel.vue'
import LivePreviewBlock from '~/components/feed/live/LivePreviewBlock.vue'
import LiveViewerDrawer from '~/components/feed/live/LiveViewerDrawer.vue'

const {
  isLive,
  busy,
  videoEl: myVideoEl,
  loadInitial,
  startLive,
  stopLive,
  switchCamera,
} = useMyLive()

const {
  candidates,
  current,
  hasCandidates,
  hasMultipleCandidates,
  refreshCandidates,
  pickRandom,
  pickNext,
} = useLiveNow()

const {
  isWatching,
  videoEl: viewerVideoEl,
  openForStreamer,
  closeViewer: closeViewerInternal,
  status: viewerStatus,
  statusMessage: viewerStatusMessageRef,
  stats: viewerStatsRef,
} = useLiveViewer()

const previewVideoEl = ref<HTMLVideoElement | null>(null)
const { startPreview, stopPreview } = useLivePreview(previewVideoEl)

// ------ вычислимые значения ------

const viewerOpen = computed(() => isWatching.value)
const viewerStatusMessage = computed(() => viewerStatusMessageRef.value)
const viewerStats = computed(() => viewerStatsRef.value)

// показывать ли слот (для одного стрима: минута показ / минута пауза)
const showSlot = ref(true)

const placeholderText = computed(() => {
  if (!hasCandidates.value) {
    return 'Сейчас нет активных эфиров. Как только кто-то выйдет в эфир, превью появится здесь.'
  }
  if (!hasMultipleCandidates.value && !showSlot.value) {
    return 'Сейчас в сети один прямой эфир. Его превью появится здесь через минуту.'
  }
  return 'Сейчас нет активных превью. Мы периодически ищем для вас что-то интересное…'
})

// ------ ref-handlers ------

function setMyVideoEl(el: HTMLVideoElement | null) {
  myVideoEl.value = el
}

function setPreviewVideoEl(el: HTMLVideoElement | null) {
  previewVideoEl.value = el
}

function setViewerVideoEl(el: HTMLVideoElement | null) {
  viewerVideoEl.value = el
}

// ------ действия стримера ------

async function onStartClick() {
  await startLive()
}

async function onSwitchCameraClick() {
  await switchCamera()
}

// ------ действия зрителя ------

async function openViewer() {
  if (!current.value) return
  stopPreview() // чтобы не было двух соединений
  openForStreamer(current.value.id)
}

async function refreshViewer() {
  if (!current.value) return
  stopPreview()
  openForStreamer(current.value.id)
}

function closeViewer() {
  closeViewerInternal()
}

// ------ таймеры для карусели превью ------

let previewTimer: number | null = null
let candidatesTimer: number | null = null

// будем помнить предыдущий набор кандидатов,
// чтобы отловить "нового" стримера и сразу показать его
let lastCandidateIds: string[] = []

function stopTimers() {
  if (previewTimer !== null) {
    clearInterval(previewTimer)
    previewTimer = null
  }
  if (candidatesTimer !== null) {
    clearInterval(candidatesTimer)
    candidatesTimer = null
  }
}

async function startPreviewForCurrent() {
  if (!current.value) return
  await startPreview(current.value.id)
}

async function initialSetup() {
  await refreshCandidates()

  lastCandidateIds = candidates.value.map((c) => c.id)

  if (hasCandidates.value) {
    // при первом заходе выбираем случайный эфир и сразу показываем
    pickRandom()
    showSlot.value = true
    await startPreviewForCurrent()
  } else {
    showSlot.value = false
  }

  if (!process.client) return

  // каждые 5 сек — обновляем список эфиров
  candidatesTimer = window.setInterval(async () => {
    const prevId = current.value?.id
    const prevIdsSet = new Set(lastCandidateIds)

    await refreshCandidates()

    const ids = candidates.value.map((c) => c.id)
    const newCandidates = candidates.value.filter(
      (c) => !prevIdsSet.has(c.id),
    )

    lastCandidateIds = ids

    if (!candidates.value.length) {
      stopPreview()
      showSlot.value = false
      return
    }

    // если появился НОВЫЙ стример — сразу показываем его минуту
    if (newCandidates.length) {
      const firstNew = newCandidates[0]
      console.log('[live-now] new streamer detected, show first:', firstNew.id)

      stopPreview()
      current.value = firstNew
      showSlot.value = true
      await startPreviewForCurrent()
      return
    }

    // если текущий стрим пропал из списка — переключаемся
    if (prevId && !candidates.value.find((c) => c.id === prevId)) {
      stopPreview()
      if (hasCandidates.value) {
        pickRandom()
        await startPreviewForCurrent()
      }
    }
  }, 5_000)

  // каждые 60 сек — логика карусели
  previewTimer = window.setInterval(async () => {
    await refreshCandidates()

    if (!hasCandidates.value) {
      showSlot.value = false
      stopPreview()
      return
    }

    if (!hasMultipleCandidates.value) {
      // один стрим: минута показываем, минута пауза (старое поведение)
      if (showSlot.value) {
        showSlot.value = false
        stopPreview()
      } else {
        showSlot.value = true
        // всегда показываем единственный эфир
        current.value = candidates.value[0]
        await startPreviewForCurrent()
      }
      return
    }

    // несколько стримов: крутим по кругу
    showSlot.value = true
    stopPreview()
    pickNext()
    await startPreviewForCurrent()
  }, 60_000)
}

// ------ жизненный цикл ------

onMounted(async () => {
  await loadInitial({ autoResume: true })
  await initialSetup()
})

onBeforeUnmount(() => {
  stopPreview()
  stopTimers()
})
</script>