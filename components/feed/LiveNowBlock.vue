<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="myBusy"
        @click="startLive"
      >
        Транслировать меня
      </button>

      <button
        v-else
        type="button"
        class="live-card__action live-card__action--stop"
        :disabled="myBusy"
        @click="stopLive"
      >
        Завершить эфир
      </button>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Мой эфир -->
      <div v-if="isLive" class="live-card__video-wrapper">
        <span class="live-card__badge live-card__badge--live">ВЫ В ЭФИРЕ</span>

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

      <!-- Когда не в эфире -->
      <div v-else class="live-card__placeholder">
        <span class="live-card__badge live-card__badge--idle">Эфир</span>
        <p>
          Сейчас нет активных эфиров или мы ещё ищем для вас что-то
          интересное…
        </p>
      </div>

      <!-- Блок с рандомным стримом -->
      <div
        v-if="currentLive && !isCurrentMine"
        class="live-card__now"
      >
        <p class="live-card__now-text">
          Сейчас в эфире
          <strong>
            {{ currentLive.display_name || currentLive.email }}
          </strong>
          <span v-if="currentLive.live_started_at">
            (с {{ formatTime(currentLive.live_started_at) }})
          </span>
        </p>

        <button
          type="button"
          class="live-card__now-button"
          :disabled="viewerBusy"
          @click="openViewer"
        >
          Перейти к трансляции
        </button>
      </div>
    </div>

    <!-- Панель просмотра чужого стрима -->
    <teleport to="body">
      <div
        v-if="viewerPanelOpen && currentStreamer"
        class="live-viewer-backdrop"
        @click.self="closeViewer"
      >
        <div class="live-viewer-panel">
          <header class="live-viewer-header">
            <div class="live-viewer-title">
              Эфир
              {{ currentStreamer.display_name || currentStreamer.email }}
            </div>
            <button
              type="button"
              class="live-viewer-close"
              @click="closeViewer"
            >
              ✕
            </button>
          </header>

          <div class="live-viewer-body">
            <video
              ref="viewerVideoEl"
              class="live-viewer-video"
              autoplay
              playsinline
              controls
            ></video>

            <p class="live-viewer-hint">
              Если видео не появилось через несколько секунд, попробуйте
              закрыть и открыть трансляцию ещё раз.
            </p>
          </div>
        </div>
      </div>
    </teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useSupabaseUser } from '#imports'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

const authUser = useSupabaseUser()

const {
  isLive,
  busy: myBusy,
  videoEl: myVideoEl,
  loadInitial,
  startLive,
  stopLive,
} = useMyLive()

const {
  current,
  loading: liveNowLoading,
  startRotation,
  stopRotation,
  loadCandidates,
} = useLiveNow()

const {
  videoEl: viewerVideoEl,
  isWatching,
  busy: viewerBusy,
  panelOpen: viewerPanelOpen,
  currentStreamer,
  watchStreamer,
  stopWatching,
} = useLiveViewer()

onMounted(async () => {
  await loadInitial()
  await loadCandidates()
  await startRotation()
})

onBeforeUnmount(() => {
  stopRotation()
  void stopWatching()
})

const currentLive = computed(() => current.value || null)

const isCurrentMine = computed(() => {
  const userId = (authUser.value as any)?.id ?? (authUser.value as any)?.sub
  if (!userId || !currentLive.value) return false
  return currentLive.value.id === userId
})

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

async function openViewer() {
  if (!currentLive.value) return
  await watchStreamer(currentLive.value)
}

async function closeViewer() {
  await stopWatching()
}
</script>

<style scoped>
.live-card {
  margin-top: 16px;
}

/* Кнопки «транслировать / завершить» */
.live-card__action {
  min-width: 160px;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 14px;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12);
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
}

.live-card__action:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.live-card__action--start {
  background: linear-gradient(135deg, #466bff, #7f7bff);
  color: #fff;
}

.live-card__action--stop {
  background: linear-gradient(135deg, #ff6b6b, #ff9f7f);
  color: #fff;
}

/* Видео блока */
.live-card__video-wrapper {
  position: relative;
  background: #020617;
  border-radius: 24px;
  padding: 12px 12px 16px;
  color: #e5e7eb;
}

.live-card__player {
  display: block;
  width: 100%;
  border-radius: 18px;
  background: #020617;
  max-height: 260px;
  object-fit: cover;
}

.live-card__hint {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.8;
}

.live-card__badge {
  position: absolute;
  top: 10px;
  left: 14px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.live-card__badge--live {
  background: #fb5a36;
  color: #fff7ed;
}

.live-card__badge--idle {
  position: static;
  display: inline-flex;
  margin-bottom: 6px;
  background: #0f172a;
  color: #e5e7eb;
}

/* Плейсхолдер, когда не в эфире */
.live-card__placeholder {
  border-radius: 20px;
  padding: 16px 18px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(18px);
  font-size: 14px;
}

/* Блок «сейчас в эфире» под основным */
.live-card__now {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed rgba(15, 23, 42, 0.08);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.live-card__now-text strong {
  font-weight: 600;
}

.live-card__now-button {
  margin-left: auto;
  border-radius: 999px;
  padding: 6px 14px;
  border: none;
  font-size: 13px;
  cursor: pointer;
  background: #0f172a;
  color: #f9fafb;
}

/* Выезжающая панель просмотра */
.live-viewer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: flex-end;
  z-index: 60;
}

.live-viewer-panel {
  width: min(420px, 100%);
  height: 100%;
  background: #f9fafb;
  box-shadow: -24px 0 40px rgba(15, 23, 42, 0.25);
  border-radius: 24px 0 0 24px;
  padding: 18px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.live-viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
}

.live-viewer-close {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.live-viewer-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.live-viewer-video {
  width: 100%;
  border-radius: 20px;
  background: #020617;
  max-height: 320px;
  object-fit: cover;
}

.live-viewer-hint {
  font-size: 13px;
  color: #6b7280;
}

/* Мобильные правки */
@media (max-width: 640px) {
  .live-viewer-panel {
    width: 100%;
    border-radius: 20px 20px 0 0;
    justify-content: flex-start;
  }

  .live-viewer-backdrop {
    align-items: flex-end;
  }
}
</style>