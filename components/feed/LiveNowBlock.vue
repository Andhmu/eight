<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <!-- Кнопка управления своим эфиром -->
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
      <!-- 1. Я в эфире: показываем МОЮ камеру -->
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

      <!-- 2. Я НЕ в эфире: показываем случайного стримера, если он есть -->
      <div v-else>
        <div
          v-if="currentLiveUser"
          class="live-card__viewer"
          @click="goToCurrentProfile"
        >
          <span class="live-card__badge live-card__badge--viewer">
            Сейчас в эфире
          </span>

          <div class="live-card__viewer-main">
            <div class="live-card__avatar">
              {{ currentInitial }}
            </div>

            <div class="live-card__meta">
              <p class="live-card__name">
                {{ currentLiveUser.email || 'Пользователь' }}
              </p>
              <p class="live-card__time">
                в эфире с {{ formattedStartedAt }}
              </p>
            </div>
          </div>

          <p class="live-card__hint">
            Нажмите, чтобы перейти в профиль как гость.
          </p>
        </div>

        <!-- 3. Стримеров нет: заглушка -->
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
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'

const router = useRouter()

// Мой эфир (камера)
const {
  isLive,
  busy: myBusy,
  videoEl,
  loadInitial,
  startLive,
  stopLive,
} = useMyLive()

// Чужие эфиры (случайный стример)
const {
  current,
  loading: othersLoading,
  startRotation,
  stopRotation,
} = useLiveNow()

// Общий "busy", чтобы не дёргать интерфейс, пока что-то грузится
const busy = computed(() => myBusy.value || othersLoading.value)

// Текущий стример для отображения
const currentLiveUser = computed(() => current.value)

// Буква-инициал для аватарки
const currentInitial = computed(() => {
  const email = currentLiveUser.value?.email || ''
  return email.charAt(0).toUpperCase() || 'U'
})

// Красивое время начала эфира (для подписи)
const formattedStartedAt = computed(() => {
  const iso = currentLiveUser.value?.live_started_at
  if (!iso) return 'недавно'

  const d = new Date(iso)
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
})

// Переход в профиль стримера
function goToCurrentProfile() {
  if (!currentLiveUser.value) return
  router.push(`/profile/${currentLiveUser.value.id}`)
}

onMounted(() => {
  // 1. узнаём, не были ли мы уже в эфире
  loadInitial()
  // 2. запускаем подбор и ротацию чужих эфиров
  startRotation()
})

onBeforeUnmount(() => {
  stopRotation()
})
</script>