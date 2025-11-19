<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <!-- Кнопка для запуска / остановки своего эфира -->
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
      <!-- 1. Когда Я в эфире — показываем мою камеру -->
      <div v-if="isLive" class="live-card__video-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>

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

      <!-- 2. Когда я НЕ в эфире, но кто-то другой в эфире -->
      <div
        v-else-if="hasCurrent && current"
        class="live-card__viewer-info"
      >
        <p class="live-card__now">Сейчас в эфире</p>
        <p class="live-card__viewer-name">
          {{ current.username || current.email || 'Пользователь' }}
        </p>
        <p v-if="formattedStartedAt" class="live-card__viewer-time">
          в эфире с {{ formattedStartedAt }}
        </p>

        <button
          type="button"
          class="live-card__watch-btn"
          @click="goToProfile"
        >
          Перейти в профиль как гость
        </button>
      </div>

      <!-- 3. Никто не в эфире -->
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
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from '#imports'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'

const router = useRouter()

// Мой собственный эфир (камера)
const { isLive, busy, videoEl, loadInitial, startLive, stopLive } = useMyLive()

// Список чужих лайвов / рандомный текущий
const {
  current,
  hasCurrent,
  loading: liveLoading,
  startRotation,
  stopRotation,
  reloadNow,
} = useLiveNow()

const formattedStartedAt = computed(() => {
  if (!current.value?.live_started_at) return ''
  const d = new Date(current.value.live_started_at)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function goToProfile() {
  if (!current.value) return
  await router.push(`/profile/${current.value.id}`)
}

onMounted(() => {
  loadInitial()
  startRotation()
})

onBeforeUnmount(() => {
  stopRotation()
})
</script>
