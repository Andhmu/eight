<!-- FILE: components/feed/live/LiveViewerDrawer.vue -->
<template>
  <transition name="live-sheet">
    <div v-if="isOpen" class="live-sheet">
      <div class="live-sheet__backdrop" @click="$emit('close')"></div>

      <div class="live-sheet__panel">
        <header class="live-sheet__header">
          <div class="live-sheet__title">
            Эфир
            <span v-if="currentEmail"> {{ currentEmail }}</span>
          </div>
          <button
            class="live-sheet__close"
            type="button"
            @click="$emit('close')"
          >
            ×
          </button>
        </header>

        <main class="live-sheet__body">
          <div class="live-sheet__video-frame">
            <video
              :ref="setVideoEl"
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
              @click="$emit('refresh')"
            >
              ⟳ Обновить трансляцию
            </button>

            <p class="live-sheet__status" v-if="statusMessage">
              {{ statusMessage }}
            </p>
          </div>

          <p class="live-sheet__stats" v-if="stats">
            Скорость:
            <span v-if="stats.bitrateKbps !== null">
              {{ stats.bitrateKbps }} кбит/с
            </span>
            <span v-else>н/д</span>
            <span v-if="stats.rttMs !== null">
              · Пинг: {{ stats.rttMs }} мс
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
</template>

<script setup lang="ts">
// интерфейсы и пропсы вынесены как были
interface ViewerStats {
  bitrateKbps: number | null
  rttMs: number | null
}

const props = defineProps<{
  isOpen: boolean
  currentEmail: string | null
  statusMessage: string | null
  stats: ViewerStats | null
  setVideoEl: (el: HTMLVideoElement | null) => void
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()
</script>
