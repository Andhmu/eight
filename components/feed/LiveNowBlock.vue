<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <!-- Кнопка стримера -->
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

      <!-- Я не в эфире – показываем чужие -->
      <div v-else>
        <!-- Текущий рекомендованный эфир -->
        <div v-if="current">
          <p class="live-card__now">
            Сейчас в эфире
          </p>
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

        <!-- Если никого нет -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных эфиров или мы ещё ищем для вас что-то интересное…
          </p>
        </div>
      </div>
    </div>

    <!-- Выезжающая панель со стримом -->
    <transition name="live-sheet">
      <div v-if="viewerOpenLocal" class="live-sheet">
        <div class="live-sheet__backdrop" @click="handleCloseViewer"></div>

        <div class="live-sheet__panel">
          <header class="live-sheet__header">
            <div class="live-sheet__title">
              Эфир
              <span v-if="current?.email"> {{ current.email }}</span>
            </div>
            <button
              class="live-sheet__close"
              type="button"
              @click="handleCloseViewer"
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

            <p class="live-sheet__hint">
              Если видео не появилось через несколько секунд, попробуйте закрыть
              и открыть трансляцию ещё раз.
            </p>
          </main>
        </div>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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
} = useMyLive()

const { current, startRotation } = useLiveNow()

const {
  isWatching,
  videoEl: viewerVideoEl,
  openForStreamer,
  closeViewer: closeViewerInternal,
} = useLiveViewer()

// Локальный флаг открытия шторки
const viewerOpenLocal = ref(false)

const isWatchingComputed = computed(() => isWatching.value)

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function onStartClick() {
  await startLive()
}

async function openViewer() {
  if (!current.value) return

  // Сначала открываем панель, даём смонтироваться <video>,
  // потом запускаем WebRTC-подключение
  viewerOpenLocal.value = true
  await nextTick()

  openForStreamer(current.value.id)
}

function handleCloseViewer() {
  viewerOpenLocal.value = false
  closeViewerInternal()
}

// Если внутри composable просмотр завершается (например, по ошибке),
// синхронизируем локальное состояние шторки.
watch(isWatchingComputed, (val) => {
  if (!val) {
    viewerOpenLocal.value = false
  }
})

onMounted(async () => {
  await loadInitial()
  await startRotation()
})
</script>

<style scoped>
.live-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live-card__action {
  border-radius: 999px;
  padding: 0.4rem 1.2rem;
  font-size: 0.85rem;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.18);
}

.live-card__action--start {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
}

.live-card__action--stop {
  background: linear-gradient(135deg, #f97373, #fb7185);
  color: #fff;
}

.live-card__body {
  margin-top: 0.75rem;
}

.live-card__video-wrapper {
  background: #020617;
  border-radius: 1.25rem;
  padding: 0.75rem;
  color: #e5e7eb;
}

.live-card__player {
  width: 100%;
  border-radius: 1rem;
  background: #020617;
}

.live-card__hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.live-card__badge {
  display: inline-block;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: #f97316;
  color: #fff;
}

.live-card__badge--idle {
  background: #111827;
  color: #f9fafb;
}

.live-card__placeholder {
  background: #f9fafb;
  border-radius: 1.25rem;
  padding: 0.75rem;
  font-size: 0.9rem;
  color: #111827;
}

.live-card__now {
  font-weight: 600;
}

.live-card__user-email {
  margin-top: 0.25rem;
  font-weight: 500;
}

.live-card__since {
  margin-top: 0.15rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.live-card__watch-btn {
  margin-top: 0.75rem;
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
  color: white;
}

/* sheet */

.live-sheet-enter-active,
.live-sheet-leave-active {
  transition: opacity 0.2s ease, transform 0.25s ease;
}

.live-sheet-enter-from,
.live-sheet-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.live-sheet {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.live-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(8px);
}

.live-sheet__panel {
  position: relative;
  width: 100%;
  max-width: 480px;
  margin: 0 auto 1rem;
  background: #f9fafb;
  border-radius: 1.5rem;
  padding: 0.75rem 1rem 1rem;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.3);
}

.live-sheet__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.live-sheet__title {
  font-weight: 600;
}

.live-sheet__close {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.live-sheet__body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.live-sheet__video {
  width: 100%;
  border-radius: 1rem;
  background: #020617;
}

.live-sheet__hint {
  font-size: 0.8rem;
  color: #4b5563;
}
</style>
