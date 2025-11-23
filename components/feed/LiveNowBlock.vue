<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <!-- Холо-шапка -->
    <div class="live-card__header">
      <div class="live-card__header-left">
        <h2 class="live-card__title">Прямой эфир</h2>
        <span class="live-card__subtitle">режим beta</span>
      </div>

      <div class="live-card__header-actions">
        <!-- Я не в эфире — большая holo-кнопка запуска -->
        <button
          v-if="!isLive"
          type="button"
          class="live-card__action live-card__action--start"
          :disabled="busy"
          @click="onStartClick"
        >
          <span class="live-card__action-glow"></span>
          <span class="live-card__action-label">Транслировать меня</span>
        </button>

        <!-- Я в эфире — индикатор + маленькие кнопки -->
        <div v-else class="live-card__header-live">
          <span class="live-card__status-pill">
            <span class="live-card__status-dot" />
            В эфире
          </span>

          <button
            type="button"
            class="live-card__chip live-card__chip--header"
            :disabled="busy"
            @click="onSwitchCameraClick"
          >
            ⇄ Сменить камеру
          </button>
        </div>
      </div>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Я сам в эфире: holo-рамка с круглой кнопкой снизу, как на референсе -->
      <div v-if="isLive" class="live-card__holo">
        <div class="live-card__holo-frame">
          <div class="live-card__screen">
            <video
              ref="myVideoEl"
              class="live-card__player"
              autoplay
              muted
              playsinline
            ></video>
          </div>

          <div class="live-card__holo-bottom">
            <button
              type="button"
              class="live-card__chip"
              :disabled="busy"
              @click="onSwitchCameraClick"
            >
              ⇄ Сменить камеру
            </button>

            <button
              type="button"
              class="live-card__circle-btn"
              :disabled="busy"
              @click="stopLive"
            >
              <span class="live-card__circle-inner">
                Завершить
                <span class="live-card__circle-sub">трансляцию</span>
              </span>
            </button>

            <div class="live-card__meta">
              <span class="live-card__meta-label">Вы в эфире</span>
              <span class="live-card__meta-separator">•</span>
              <span class="live-card__meta-text">
                Ваш эфир виден другим пользователям
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Я не в эфире – превью чужих эфиров с каруселью -->
      <div v-else class="live-card__viewer-wrapper">
        <!-- Превью-карточка (до минуты, с видео) -->
        <div
          v-if="current && showSlot"
          class="live-card__current live-card__current--with-preview"
        >
          <div class="live-card__preview-frame">
            <div class="live-card__preview-screen">
              <video
                ref="previewVideoEl"
                class="live-card__preview-player"
                autoplay
                muted
                playsinline
              ></video>
            </div>
          </div>

          <div class="live-card__current-info">
            <p class="live-card__now">Сейчас в эфире</p>
            <p class="live-card__user-email">
              {{ current.email || 'Пользователь' }}
            </p>
            <p class="live-card__since" v-if="current.live_started_at">
              в эфире с {{ formatTime(current.live_started_at) }}
            </p>
            <p class="live-card__subtitle-text">
              Превью прямого эфира. Нажмите, чтобы подключиться.
            </p>

            <button
              type="button"
              class="live-card__watch-btn"
              @click="openViewer"
            >
              <span class="live-card__watch-label">Перейти к трансляции</span>
            </button>
          </div>
        </div>

        <!-- Пауза/нет эфиров -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>{{ placeholderText }}</p>
        </div>
      </div>
    </div>

    <!-- Выезжающая панель просмотра -->
    <transition name="live-sheet">
      <div v-if="viewerOpen" class="live-sheet">
        <div class="live-sheet__backdrop" @click="closeViewer"></div>

        <div class="live-sheet__panel">
          <header class="live-sheet__header">
            <div class="live-sheet__title">
              Эфир
              <span v-if="current?.email"> {{ current.email }}</span>
            </div>
            <button
              class="live-sheet__close"
              type="button"
              @click="closeViewer"
            >
              ×
            </button>
          </header>

          <main class="live-sheet__body">
            <div class="live-sheet__video-frame">
              <video
                ref="viewerVideoEl"
                class="live-sheet__video"
                autoplay
                playsinline
                controls
              ></video>
            </div>

            <div class="live-sheet__controls">
              <button
                type="button"
                class="live-sheet__refresh"
                @click="refreshViewer"
              >
                ⟳ Обновить трансляцию
              </button>

              <p class="live-sheet__status" v-if="viewerStatusMessage">
                {{ viewerStatusMessage }}
              </p>
            </div>

            <p class="live-sheet__stats" v-if="viewerStats">
              Скорость:
              <span v-if="viewerStats.bitrateKbps !== null">
                {{ viewerStats.bitrateKbps }} кбит/с
              </span>
              <span v-else>н/д</span>
              <span v-if="viewerStats.rttMs !== null">
                · Пинг: {{ viewerStats.rttMs }} мс
              </span>
            </p>

            <p class="live-sheet__hint">
              Если видео не появилось через несколько секунд, попробуйте
              обновить трансляцию или закрыть и открыть эфир ещё раз.
            </p>
          </main>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'
import { useLivePreview } from '~/composables/live/useLivePreview'

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
const { isPreviewing, startPreview, stopPreview } = useLivePreview(previewVideoEl)

const viewerOpen = computed(() => isWatching.value)
const viewerStatusMessage = computed(() => viewerStatusMessageRef.value)
const viewerStats = computed(() => viewerStatsRef.value)

// показывать ли слот (для кейса одного стрима: минута показ / минута пауза)
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

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

async function onStartClick() {
  await startLive()
}

async function onSwitchCameraClick() {
  await switchCamera()
}

async function openViewer() {
  if (!current.value) return
  // чтобы не было двух соединений одновременно
  stopPreview()
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

let previewTimer: number | null = null
let candidatesTimer: number | null = null

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

  if (hasCandidates.value) {
    pickRandom()
    showSlot.value = true
    await startPreviewForCurrent()
  } else {
    showSlot.value = false
  }

  if (!process.client) return

  // каждые 5 секунд — обновляем список эфиров
  candidatesTimer = window.setInterval(async () => {
    const prevId = current.value?.id
    await refreshCandidates()

    if (!candidates.value.length) {
      // эфиров вообще нет
      stopPreview()
      showSlot.value = false
      return
    }

    // текущий стример исчез — переключаемся
    if (prevId && !candidates.value.find((c) => c.id === prevId)) {
      stopPreview()
      if (hasCandidates.value) {
        pickRandom()
        await startPreviewForCurrent()
      }
    }
  }, 5_000)

  // каждые 60 секунд — логика карусели превью
  previewTimer = window.setInterval(async () => {
    await refreshCandidates()

    if (!hasCandidates.value) {
      showSlot.value = false
      stopPreview()
      return
    }

    if (!hasMultipleCandidates.value) {
      // один стрим: минута показываем, минута пауза
      if (showSlot.value) {
        showSlot.value = false
        stopPreview()
      } else {
        showSlot.value = true
        pickRandom()
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

onMounted(async () => {
  await loadInitial({ autoResume: true })
  await initialSetup()
})

onBeforeUnmount(() => {
  stopPreview()
  stopTimers()
})
</script>
