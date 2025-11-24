<!-- FILE: LivePreviewBlock.vue -->
<template>
  <div class="live-card__preview-full">

    <!-- ВИДЕО ПРЕВЬЮ -->
    <video
      v-if="current && showSlot"
      :ref="setPreviewVideoEl"
      class="live-card__full-video"
      autoplay
      muted
      playsinline
    ></video>

    <!-- ПЛЕЙСХОЛДЕР -->
    <div v-else class="live-card__placeholder-full">
      <span class="live-card__badge">Эфир</span>
      <p>{{ placeholderText }}</p>
    </div>

    <!-- НИЖНЯЯ ПЛАШКА -->
    <div
      v-if="current && showSlot"
      class="live-card__overlay-bar"
    >
      <div class="live-card__overlay-left">
        <p class="live-card__overlay-now">Сейчас в эфире</p>
        <p class="live-card__overlay-email">{{ current.email }}</p>
      </div>

      <button class="live-card__overlay-btn" @click="$emit('openViewer')">
        Смотреть ▶
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const emit = defineEmits(['openViewer'])
</script>
