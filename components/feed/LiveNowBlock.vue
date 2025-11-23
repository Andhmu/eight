<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <div class="live-card__header-left">
        <h2 class="live-card__title">Прямой эфир</h2>
        <span class="live-card__subtitle">режим beta</span>
      </div>

      <div class="live-card__header-actions">
        <!-- когда не в эфире — главная holo-кнопка -->
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

        <!-- когда в эфире — индикатор + кнопки -->
        <div v-else class="live-card__header-live">
          <span class="live-card__status-pill">
            <span class="live-card__status-dot" />
            В эфире
          </span>

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
            class="live-card__action live-card__action--stop"
            :disabled="busy"
            @click="stopLive"
          >
            <span class="live-card__action-glow live-card__action-glow--danger"></span>
            <span class="live-card__action-label">Завершить эфир</span>
          </button>
        </div>
      </div>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Я сам в эфире -->
      <div v-if="isLive" class="live-card__holo-frame">
        <div class="live-card__screen">
          <video
            ref="myVideoEl"
            class="live-card__player"
            autoplay
            muted
            playsinline
          ></video>
        </div>

        <div class="live-card__meta">
          <span class="live-card__meta-label">Вы в эфире</span>
          <span class="live-card__meta-separator">•</span>
          <span class="live-card__meta-text">
            Ваш эфир сейчас доступен другим пользователям.
          </span>
        </div>
      </div>

      <!-- Я не в эфире – превью чужих эфиров -->
      <div v-else class="live-card__viewer-wrapper">
        <!-- Превью-карточка -->
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

        <!-- Плейсхолдер, когда слот скрыт или эфиров нет -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>{{ placeholderText }}</p>
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

    // текущий стример исчез
    if (prevId && !candidates.value.find((c) => c.id === prevId)) {
      stopPreview()
      if (hasCandidates.value) {
        pickRandom()
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

    // два и более стримов: всегда показываем,
    // каждые 60 секунд переключаемся на следующего по кругу
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

<style scoped>
/* ============================
   Холо-карточка прямого эфира
   ============================ */

.live-card {
  position: relative;
  border-radius: 26px;
  padding: 16px 18px;
  background: rgba(248, 250, 252, 0.02);
  border: 1.2px solid rgba(125, 211, 252, 0.8);
  box-shadow:
    0 0 26px rgba(56, 189, 248, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* Шапка */

.live-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.live-card__header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live-card__title {
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #0f172a;
}

.live-card__subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9ca3af;
}

.live-card__header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-card__header-live {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Индикатор «в эфире» */

.live-card__status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.7);
  background: rgba(240, 249, 255, 0.8);
  color: #0369a1;
  font-size: 0.76rem;
  font-weight: 500;
}

.live-card__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.8);
}

/* Главные кнопки */

.live-card__action {
  position: relative;
  padding: 7px 18px;
  border-radius: 999px;
  border: none;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #0b1120;
  background: transparent;
  overflow: hidden;
  transition:
    transform 0.12s ease-out,
    box-shadow 0.15s ease-out,
    opacity 0.12s ease-out;
}

.live-card__action-glow {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.4), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(129, 140, 248, 0.5), transparent 60%);
  box-shadow:
    0 0 24px rgba(56, 189, 248, 0.85),
    0 0 0 1px rgba(224, 242, 254, 0.95);
}

.live-card__action-glow--danger {
  background:
    radial-gradient(circle at 0% 0%, rgba(251, 113, 133, 0.55), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(248, 113, 113, 0.55), transparent 60%);
  box-shadow:
    0 0 24px rgba(248, 113, 113, 0.9),
    0 0 0 1px rgba(254, 242, 242, 0.95);
}

.live-card__action-label {
  position: relative;
  z-index: 1;
}

.live-card__action--start {
  color: #0b1120;
}

.live-card__action--stop {
  color: #7f1d1d;
}

.live-card__action:hover:not(:disabled) {
  transform: translateY(-1px);
}

.live-card__action:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Маленькая holo-кнопка (смена камеры) */

.live-card__chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 0.76rem;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
  transition:
    transform 0.12s ease-out,
    box-shadow 0.15s ease-out,
    background 0.15s ease-out;
}

.live-card__chip:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.2);
}

/* Тело карточки */

.live-card__body {
  margin-top: 14px;
}

/* Свой эфир: рамка под размер видео */

.live-card__holo-frame {
  border-radius: 22px;
  padding: 8px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  background:
    radial-gradient(circle at 0% 0%, rgba(239, 246, 255, 0.85), transparent 60%),
    rgba(255, 255, 255, 0.88);
  box-shadow:
    0 18px 40px rgba(148, 163, 184, 0.45),
    0 0 28px rgba(56, 189, 248, 0.55);
  display: grid;
  gap: 8px;
}

.live-card__screen {
  border-radius: 16px;
  padding: 4px;
  border: 1px solid rgba(186, 230, 253, 0.85);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.7), transparent 60%),
    #020617;
}

.live-card__player {
  display: block;
  width: 100%;
  max-height: min(60vh, 360px);
  border-radius: 12px;
  background: #000;
  object-fit: contain;
}

/* подпись под своим эфиром */

.live-card__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 0.78rem;
  color: #4b5563;
}

.live-card__meta-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.68rem;
  color: #0ea5e9;
}

.live-card__meta-separator {
  opacity: 0.6;
}

/* Превью чужих эфиров */

.live-card__viewer-wrapper {
  margin-top: 4px;
}

.live-card__current {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.live-card__preview-frame {
  flex: 0 0 180px;
  max-width: 50%;
  border-radius: 20px;
  padding: 6px;
  border: 1px solid rgba(191, 219, 254, 0.95);
  background:
    radial-gradient(circle at 0% 0%, rgba(239, 246, 255, 0.9), transparent 60%),
    rgba(248, 250, 252, 0.96);
  box-shadow: 0 16px 36px rgba(148, 163, 184, 0.4);
}

.live-card__preview-screen {
  border-radius: 14px;
  padding: 4px;
  border: 1px solid rgba(148, 163, 184, 0.8);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.7), transparent 60%),
    #020617;
}

.live-card__preview-player {
  display: block;
  width: 100%;
  max-height: 120px;
  border-radius: 10px;
  background: #000;
  object-fit: contain;
}

.live-card__current-info {
  flex: 1;
  display: grid;
  gap: 4px;
}

.live-card__now {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: #6b7280;
}

.live-card__user-email {
  font-weight: 600;
  font-size: 0.95rem;
  color: #0f172a;
}

.live-card__since {
  font-size: 0.78rem;
  color: #6b7280;
}

.live-card__subtitle-text {
  font-size: 0.8rem;
  color: #9ca3af;
}

/* Кнопка «Перейти к трансляции» */

.live-card__watch-btn {
  margin-top: 8px;
  align-self: flex-start;
  padding: 7px 16px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background:
    radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.4), transparent 65%),
    linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #0b1120;
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow:
    0 12px 28px rgba(8, 47, 73, 0.35),
    0 0 0 1px rgba(219, 234, 254, 1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    transform 0.12s ease-out,
    box-shadow 0.15s ease-out;
}

.live-card__watch-btn::after {
  content: '▶';
  font-size: 0.8rem;
}

.live-card__watch-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 16px 36px rgba(8, 47, 73, 0.5),
    0 0 0 1px rgba(248, 250, 252, 1);
}

/* Плейсхолдер */

.live-card__placeholder {
  margin-top: 4px;
  padding: 14px 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px dashed rgba(191, 219, 254, 0.9);
  font-size: 0.88rem;
  color: #4b5563;
}

.live-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  margin-bottom: 6px;
  background: rgba(239, 246, 255, 0.96);
  color: #0369a1;
}

/* =============================
   Выезжающая панель просмотра
   ============================== */

.live-sheet-enter-active,
.live-sheet-leave-active {
  transition: opacity 0.22s ease, transform 0.24s ease;
}

.live-sheet-enter-from,
.live-sheet-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.live-sheet {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

/* фон */

.live-sheet__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.25), transparent 60%),
    rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

/* holo-панель */

.live-sheet__panel {
  position: relative;
  width: 100%;
  max-width: 540px;
  margin: 0 auto 16px;
  padding: 14px 16px 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 0% 0%, rgba(239, 246, 255, 0.9), transparent 60%),
    rgba(248, 250, 252, 0.98);
  border: 1.3px solid rgba(191, 219, 254, 0.9);
  box-shadow:
    0 24px 64px rgba(15, 23, 42, 0.9),
    0 0 36px rgba(56, 189, 248, 0.75);
  z-index: 51;
}

/* шапка панели */

.live-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.live-sheet__title {
  font-size: 0.96rem;
  font-weight: 600;
  color: #0f172a;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}

.live-sheet__title span {
  font-size: 0.8rem;
  font-weight: 500;
  color: #4b5563;
}

.live-sheet__close {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: none;
  background: rgba(148, 163, 184, 0.18);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: #111827;
  transition: background 0.12s ease-out, transform 0.12s ease-out;
}

.live-sheet__close:hover {
  background: rgba(148, 163, 184, 0.3);
  transform: translateY(-1px);
}

/* тело панели + видео */

.live-sheet__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-sheet__video-frame {
  border-radius: 18px;
  padding: 4px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  background:
    radial-gradient(circle at 0% 0%, rgba(15, 23, 42, 0.7), transparent 60%),
    #020617;
}

.live-sheet__video {
  display: block;
  width: 100%;
  max-height: min(70vh, 460px);
  border-radius: 14px;
  background: #000;
  object-fit: contain;
}

/* нижняя зона панели */

.live-sheet__controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.live-sheet__refresh {
  padding: 6px 16px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.96);
  color: #e5e7eb;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.8),
    0 0 0 1px rgba(15, 23, 42, 1);
  transition:
    transform 0.13s ease-out,
    box-shadow 0.15s ease-out,
    background 0.15s ease-out;
}

.live-sheet__refresh:hover {
  transform: translateY(-1px);
  box-shadow:
    0 16px 32px rgba(15, 23, 42, 1),
    0 0 0 1px rgba(248, 250, 252, 0.95);
}

.live-sheet__status {
  font-size: 0.8rem;
  color: #4b5563;
}

.live-sheet__stats {
  font-size: 0.78rem;
  color: #6b7280;
}

.live-sheet__hint {
  font-size: 0.78rem;
  color: #9ca3af;
}
</style>
