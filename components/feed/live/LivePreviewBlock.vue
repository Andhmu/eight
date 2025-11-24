<!-- FILE: components/feed/live/LivePreviewBlock.vue -->
<template>
  <div class="live-card__viewer-wrapper">
    <!-- Режим просмотра: inline-плеер зрителя на месте превью -->
    <div v-if="isWatching" class="live-card__viewer-live-frame">
      <div class="live-card__viewer-live-screen">
        <video
          :ref="setViewerVideoEl"
          class="live-card__viewer-video"
          autoplay
          playsinline
          controls
        ></video>

        <div class="live-card__viewer-top">
          <div class="live-card__viewer-top-left">
            <span class="live-card__viewer-title">Смотрим эфир</span>
            <span class="live-card__viewer-email">
              {{ current?.email || 'Пользователь' }}
            </span>
          </div>

          <button
            type="button"
            class="live-card__viewer-close"
            @click="$emit('closeViewer')"
          >
            Закрыть
          </button>
        </div>
      </div>

      <p class="live-card__viewer-status" v-if="statusMessage">
        {{ statusMessage }}
      </p>
    </div>

    <!-- Режим превью -->
    <div
      v-else-if="current && showSlot"
      class="live-card__current live-card__current--with-preview"
    >
      <div class="live-card__preview-frame">
        <div class="live-card__preview-screen">
          <video
            :ref="setPreviewVideoEl"
            class="live-card__preview-player"
            autoplay
            muted
            playsinline
          ></video>

          <div class="live-card__preview-overlay">
            <div class="live-card__preview-meta">
              <p class="live-card__now">Сейчас в эфире</p>
              <p class="live-card__user-email">
                {{ current.email || 'Пользователь' }}
              </p>
              <p class="live-card__since" v-if="current.live_started_at">
                в эфире с {{ formatTime(current.live_started_at) }}
              </p>
            </div>

            <button
              type="button"
              class="live-card__watch-btn"
              @click="$emit('openViewer')"
            >
              <span class="live-card__watch-label">Перейти к трансляции</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Плейсхолдер / пауза -->
    <div v-else class="live-card__placeholder">
      <span class="live-card__badge live-card__badge--idle">Эфир</span>
      <p>{{ placeholderText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// FILE: components/feed/live/LivePreviewBlock.vue
interface LiveCandidate {
  id: string
  email?: string | null
  live_started_at?: string | null
}

interface ViewerStats {
  bitrateKbps: number | null
  rttMs: number | null
}

const props = defineProps<{
  current: LiveCandidate | null
  showSlot: boolean
  placeholderText: string

  /* превьюшный видео-элемент */
  setPreviewVideoEl: (el: HTMLVideoElement | null) => void

  /* просмотр */
  isWatching: boolean
  statusMessage: string | null
  stats: ViewerStats | null
  setViewerVideoEl: (el: HTMLVideoElement | null) => void
}>()

const emit = defineEmits<{
  openViewer: []
  closeViewer: []
}>()

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>
