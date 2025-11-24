<!-- FILE: components/feed/live/LivePreviewBlock.vue -->
<template>
  <div class="live-card__viewer-wrapper">
    <!-- Превью-карточка -->
    <div
      v-if="current && showSlot"
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

          <!-- Плашка поверх видео снизу -->
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

const props = defineProps<{
  current: LiveCandidate | null
  showSlot: boolean
  placeholderText: string
  setPreviewVideoEl: (el: HTMLVideoElement | null) => void
}>()

const emit = defineEmits<{
  openViewer: []
}>()

function formatTime(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
</script>
