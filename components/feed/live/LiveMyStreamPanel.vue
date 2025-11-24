<!-- FILE: LiveMyStreamPanel.vue -->
<template>
  <div class="live-card__preview-full">

    <!-- ВИДЕО МОЕГО СТРИМА -->
    <video
      :ref="setVideoEl"
      class="live-card__full-video"
      autoplay
      muted
      playsinline
    ></video>

    <!-- КНОПКИ СПРАВА -->
    <div class="live-card__side-buttons">
      <button
        class="live-card__side-btn"
        :disabled="busy"
        @click="$emit('switchCamera')"
      >
        🔄
      </button>

      <button
        class="live-card__side-btn live-card__side-btn--danger"
        :disabled="busy"
        @click="$emit('stopLive')"
      >
        ⏹
      </button>
    </div>

    <!-- ПЛАШКА НИЗУ -->
    <div class="live-card__stream-bar">
      <span class="live-card__stream-label">Вы в эфире • Ваш эфир виден другим пользователям</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  busy: boolean
  setVideoEl: (el: HTMLVideoElement | null) => void
}>()

const emit = defineEmits(['switchCamera', 'stopLive'])
</script>
