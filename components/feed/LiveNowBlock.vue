<template>
  <section class="feed-card live-card">
    <!-- ХОЛО-ШАПКА -->
    <div class="live-card__header">
      <div class="live-card__header-left">
        <h2 class="live-card__title">Прямой эфир</h2>
        <span class="live-card__subtitle">режим beta</span>
      </div>

      <!-- если сам не в эфире — кнопка запуска -->
      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="busy"
        @click="onStartClick"
      >
        Транслировать меня
      </button>

      <!-- если в эфире — компактный индикатор -->
      <span v-else class="live-card__status-pill">
        <span class="live-card__status-dot" />
        В эфире
      </span>
    </div>

    <div class="live-card__body">
      <!-- Я сам в эфире -->
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
              Сменить камеру
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

      <!-- Я не в эфире – показываем чужие эфиры -->
      <div v-else class="live-card__viewer-wrapper">
        <div v-if="current" class="live-card__current">
          <div class="live-card__current-main">
            <p class="live-card__now">Сейчас в эфире</p>
            <p class="live-card__user-email">
              {{ current.email || 'Пользователь' }}
            </p>
            <p class="live-card__since" v-if="current.live_started_at">
              в эфире с {{ formatTime(current.live_started_at) }}
            </p>
            <p class="live-card__subtitle-text">
              Нажмите, чтобы подключиться к прямой трансляции
            </p>
          </div>

          <button
            type="button"
            class="live-card__watch-btn"
            @click="openViewer"
          >
            Перейти к трансляции
          </button>
        </div>

        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных эфиров. Как только кто-то запустит трансляцию,
            здесь появится превью.
          </p>
        </div>
      </div>
    </div>

    <!-- ВЫЕЗЖАЮЩАЯ «ХОЛО-ПАНЕЛЬ» ДЛЯ ЗРИТЕЛЯ -->
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
            <video
              ref="viewerVideoEl"
              class="live-sheet__video"
              autoplay
              playsinline
              controls
            ></video>

            <div class="live-sheet__controls">
              <button
                type="button"
                class="live-sheet__refresh"
                @click="refreshViewer"
              >
                Обновить трансляцию
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
import { computed, onMounted } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

const {
  isLive,
  busy,
  videoEl: myVideoEl,
  loadInitial,
  startLive,
  stopLive,
  switchCamera,
} = useMyLive()

const { current, startRotation } = useLiveNow()

const {
  isWatching,
  videoEl: viewerVideoEl,
  openForStreamer,
  closeViewer: closeViewerInternal,
  status: viewerStatus,
  statusMessage: viewerStatusMessageRef,
  stats: viewerStatsRef,
} = useLiveViewer()

const viewerOpen = computed(() => isWatching.value)
const viewerStatusMessage = computed(() => viewerStatusMessageRef.value)
const viewerStats = computed(() => viewerStatsRef.value)

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

function openViewer() {
  if (!current.value) return
  openForStreamer(current.value.id)
}

function refreshViewer() {
  if (!current.value) return
  openForStreamer(current.value.id)
}

function closeViewer() {
  closeViewerInternal()
}

onMounted(async () => {
  // Восстанавливаем эфир, если профиль в БД помечен как is_live = true
  await loadInitial({ autoResume: true })
  await startRotation()
})
</script>
