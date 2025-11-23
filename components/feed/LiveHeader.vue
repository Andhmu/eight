<template>
  <header class="live-card__header">
    <div class="live-card__header-left">
      <h2 class="live-card__title">Прямой эфир</h2>
      <span class="live-card__subtitle">режим beta</span>
    </div>

    <div class="live-card__header-actions">
      <!-- Не в эфире — holo-кнопка запуска -->
      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="busy"
        @click="$emit('start')"
      >
        <span class="live-card__action-glow"></span>
        <span class="live-card__action-label">Транслировать меня</span>
      </button>

      <!-- В эфире — индикатор + чип "Сменить камеру" -->
      <div v-else class="live-card__header-live">
        <span class="live-card__status-pill">
          <span class="live-card__status-dot" />
          В эфире
        </span>

        <button
          type="button"
          class="live-card__chip live-card__chip--header"
          :disabled="busy"
          @click="$emit('switchCamera')"
        >
          ⇄ Сменить камеру
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  isLive: boolean
  busy: boolean
}>()

const emit = defineEmits<{
  start: []
  switchCamera: []
}>()
</script>