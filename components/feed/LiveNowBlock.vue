<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <!-- Кнопка запуска / остановки своего эфира -->
      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="busy"
        @click="handleStartLive"
      >
        Транслировать меня
      </button>

      <button
        v-else
        type="button"
        class="live-card__action live-card__action--stop"
        :disabled="busy"
        @click="handleStopLive"
      >
        Завершить эфир
      </button>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Блок собственного эфира -->
      <div v-if="isLive" class="live-card__my-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>

        <!-- video всегда существует, просто скрывается, если эфира нет -->
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

      <!-- Когда сам не в эфире -->
      <div v-else class="live-card__viewer-wrapper">
        <!-- Если есть кто-то в эфире -->
        <div v-if="current" class="live-card__current">
          <div class="live-card__current-main">
            <p class="live-card__status">Сейчас в эфире</p>

            <p class="live-card__name">
              {{ current.display_name || fallbackInitial(current.email) }}
            </p>
            <p class="live-card__email">
              {{ current.email }}
            </p>

            <p v-if="current.live_started_at" class="live-card__started-at">
              в эфире с {{ formatTime(current.live_started_at) }}
            </p>

            <p class="live-card__subtitle">
              Нажмите, чтобы перейти к трансляции как гость.
            </p>
          </div>

          <button
            type="button"
            class="live-card__watch-button"
            @click="openViewer"
          >
            Перейти к эфиру
          </button>
        </div>

        <!-- Если пока никто не стримит -->
        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных эфиров или мы ещё ищем для вас что-то интересное…
          </p>
        </div>
      </div>
    </div>

    <!-- Выезжающая панель просмотра эфира -->
    <LiveViewerDrawer
      v-if="showViewer && current"
      :profile="current"
      @close="closeViewer"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import LiveViewerDrawer from '~/components/live/LiveViewerDrawer.vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'

const { isLive, busy, videoEl, loadInitial, startLive, stopLive } = useMyLive()
const { current, startRotation, stopRotation } = useLiveNow()

const showViewer = ref(false)

onMounted(() => {
  // подтягиваем статус is_live и запускаем ротацию кандидатов
  loadInitial()
  startRotation()
})

onBeforeUnmount(() => {
  stopRotation()
})

function handleStartLive() {
  // видеодом-элемент уже есть (video всегда в DOM), поэтому
  // navigator.mediaDevices.getUserMedia отработает корректно
  void startLive()
}

function handleStopLive() {
  void stopLive()
}

function openViewer() {
  showViewer.value = true
}

function closeViewer() {
  showViewer.value = false
}

function fallbackInitial(email: string | null): string {
  if (!email) return 'Пользователь'
  return email.split('@')[0] || email
}

function formatTime(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}
</script>
