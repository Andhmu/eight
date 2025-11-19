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
      <!-- ВИДЕО всегда в DOM, просто состояние меняется вокруг него -->
      <div class="live-card__video-wrapper">
        <!-- бейдж "вы в эфире" только когда идёт эфир -->
        <span v-if="isLive" class="live-card__badge">ВЫ В ЭФИРЕ</span>

        <!-- ВАЖНО: ref="videoEl" из useMyLive -->
        <video
          ref="videoEl"
          class="live-card__player"
          autoplay
          muted
          playsinline
        ></video>

        <!-- Подпись под видео, когда в эфире -->
        <p v-if="isLive" class="live-card__hint">
          Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
        </p>

        <!-- Заглушка, когда НЕ в эфире -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных эфиров или мы ещё ищем для вас что-то
            интересное…
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'

const { isLive, busy, videoEl, loadInitial, startLive, stopLive } = useMyLive()

onMounted(() => {
  // Подтягиваем is_live из Supabase при заходе на страницу
  loadInitial()
})
</script>
