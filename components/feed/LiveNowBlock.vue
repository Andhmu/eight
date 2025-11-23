<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <div class="live-card__header-actions">
        <button
          v-if="isLive"
          type="button"
          class="live-card__action live-card__action--switch"
          :disabled="busy"
          @click="onSwitchCameraClick"
        >
          Поменять камеру
        </button>

        <button
          v-if="!isLive"
          type="button"
          class="live-card__action live-card__action--start"
          :disabled="busy"
          @click="onStartClick"
        >
          Транслировать меня
        </button>
        <button
          v-else
          type="button"
          class="live-card__action live-card__action--stop"
          :disabled="busy"
          @click="stopLive"
        >
          Завершить эфир
        </button>
      </div>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Я сам в эфире -->
      <div v-if="isLive" class="live-card__video-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>

        <video
          ref="myVideoEl"
          class="live-card__player"
          autoplay
          muted
          playsinline
        ></video>

        <p class="live-card__hint">
          Ваш эфир сейчас доступен другим пользователям в блоке «Прямой эфир».
        </p>
      </div>

      <!-- Я не в эфире – рандомная карусель превью чужих эфиров -->
      <div v-else>
        <!-- Превью-карточка -->
        <div v-if="current && showSlot" class="live-card__current live-card__current--with-preview">
          <div class="live-card__preview-wrapper">
            <video
              ref="previewVideoEl"
              class="live-card__preview-player"
              autoplay
              muted
              playsinline
            ></video>
          </div>

          <div class="live-card__current-info">
            <p class="live-card__now">Сейчас в эфире</p>
            <p class="live-card__user-email">
              {{ current.email || 'Пользователь' }}
            </p>
            <p class="live-card__since" v-if="current.live_started_at">
              в эфире с {{ formatTime(current.live_started_at) }}
            </p>

            <button
              type="button"
              class="live-card__watch-btn"
              @click="openViewer"
            >
              Перейти к трансляции
            </button>
          </div>
        </div>

        <!-- Плейсхолдер, когда слот скрыт или эфиров нет -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных превью. Мы периодически ищем для вас что-то
            интересное…
          </p>
        </div>
      </div>
    </div>

    <!-- Выезжающая панель -->
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
                Обновить трансляцию
              </button>
            </div>

            <p class="live-sheet__status" v-if="viewerStatusMessage">
              {{ viewerStatusMessage }}
            </p>

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

// показывать ли слот прямо сейчас (для режима "1 стример: минута показали / минута скрыли")
const showSlot = ref(true)

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

  // предварительно закрываем превью (на всякий случай)
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

  // каждые 5 секунд — обновляем список эфиров (чтобы карточка исчезала, когда стример завершил эфир)
  candidatesTimer = window.setInterval(async () => {
    const prevId = current.value?.id
    await refreshCandidates()

    // если текущего стримера больше нет, останавливаем превью
    if (!candidates.value.length || (prevId && !candidates.value.find((c) => c.id === prevId))) {
      stopPreview()
      if (hasCandidates.value) {
        pickRandom()
        if (showSlot.value) {
          await startPreviewForCurrent()
        }
      } else {
        showSlot.value = false
      }
    }
  }, 5_000)

  // каждые 60 секунд — переключаем превью / скрываем по логике
  previewTimer = window.setInterval(async () => {
    await refreshCandidates()

    if (!hasCandidates.value) {
      // эфиров нет — просто скрываем слот
      showSlot.value = false
      stopPreview()
      return
    }

    if (!hasMultipleCandidates.value) {
      // один стример: минута показали, минута — пауза
      if (showSlot.value) {
        showSlot.value = false
        stopPreview()
      } else {
        showSlot.value = true
        pickRandom() // всё равно тот же
        await startPreviewForCurrent()
      }
      return
    }

    // несколько стримеров: всегда показываем, но каждые 60 секунд — новый
    showSlot.value = true
    stopPreview()
    pickRandom()
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
