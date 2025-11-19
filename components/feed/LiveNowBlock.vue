<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <header class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <button
        v-if="!isLive"
        class="btn btn--light live-card__btn"
        type="button"
        :disabled="busy"
        @click="handleStart"
      >
        Транслировать меня
      </button>

      <button
        v-else
        class="btn live-card__btn live-card__btn--danger"
        type="button"
        :disabled="busy"
        @click="handleStop"
      >
        Завершить эфир
      </button>
    </header>

    <!-- Когда Я в эфире -->
    <div v-if="isLive" class="live-card__body live-card__body--self">
      <div class="live-card__badge">ВЫ В ЭФИРЕ</div>

      <div class="live-card__player">
        <video
          ref="videoEl"
          autoplay
          muted
          playsinline
        ></video>
      </div>

      <p class="live-card__note">
        Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
      </p>
    </div>

    <!-- Когда кто-то другой в эфире -->
    <div
      v-else-if="current && !loading"
      class="live-card__body live-card__body--other"
    >
      <div class="live-card__badge live-card__badge--other">
        Эфир
      </div>

      <p class="live-card__text">
        Сейчас в эфире
        <button
          type="button"
          class="live-card__link"
          @click="goToUser(current.id)"
        >
          @{{ current.username || 'пользователь' }}
        </button>
      </p>

      <p class="live-card__note">
        Нажмите на логин, чтобы зайти на его профиль и продолжить смотреть.
      </p>
    </div>

    <!-- Когда эфиров нет -->
    <div v-else class="live-card__body live-card__body--empty">
      <div class="live-card__badge live-card__badge--idle">
        Эфир
      </div>
      <p class="live-card__text">
        Сейчас нет активных эфиров или мы ещё ищем для вас что-то интересное…
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from '#imports'
import { useLiveNow } from '~/composables/feed/useLiveNow'
import { useMyLive } from '~/composables/live/useMyLive'

const router = useRouter()

const { current, loading, error, init } = useLiveNow()
const { isLive, busy, videoEl, loadInitial, startLive, stopLive } = useMyLive()

onMounted(async () => {
  await loadInitial()
  await init()

  if (error.value) {
    console.error('[live-now] error:', error.value)
  }
})

function handleStart() {
  void startLive()
}

function handleStop() {
  void stopLive()
}

function goToUser(id: string) {
  router.push(`/u/${id}`)
}
</script>