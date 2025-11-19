<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="busy"
        @click="startLive"
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
      <!-- Когда в эфире -->
      <div v-if="isLive" class="live-card__video-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>

        <!-- ВАЖНО: ref="videoEl" берётся из useMyLive -->
        <video
          ref="videoEl"
          class="live-card__player"
          autoplay
          muted
          playsinline
        ></video>

        <p class="live-card__hint">
          Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
        </p>
      </div>

      <!-- Когда не в эфире -->
      <div v-else class="live-card__placeholder">
        <span class="live-card__badge live-card__badge--idle">Эфир</span>
        <p>
          Сейчас нет активных эфиров или мы ещё ищем для вас что-то интересное…
        </p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'

/**
 * Берём videoEl прямо из композабла и используем его в шаблоне.
 * НИКАКИХ своих ref('') для видео тут больше не создаём.
 */
const { isLive, busy, videoEl, loadInitial, startLive, stopLive } = useMyLive()

onMounted(() => {
  // Подтягиваем состояние is_live из Supabase при заходе на страницу
  loadInitial()
})
</script>