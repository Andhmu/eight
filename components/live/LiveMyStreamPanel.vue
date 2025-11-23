<template>
  <div class="live-card__holo">
    <div class="live-card__holo-frame">
      <div class="live-card__screen">
        <video
          :ref="setVideoEl"
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
          @click="$emit('switchCamera')"
        >
          ⇄ Сменить камеру
        </button>

        <button
          type="button"
          class="live-card__circle-btn"
          :disabled="busy"
          @click="$emit('stopLive')"
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
</template>

<script setup lang="ts">
const props = defineProps<{
  busy: boolean
  setVideoEl: (el: HTMLVideoElement | null) => void
}>()

const emit = defineEmits<{
  switchCamera: []
  stopLive: []
}>()
</script>
