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
      <!-- 1. Мой эфир (видео-элемент ВСЕГДА в DOM, просто прячем его, когда не в эфире) -->
      <div v-show="isLive" class="live-card__video-wrapper">
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

      <!-- 2. Я не в эфире, но кто-то другой в эфире -->
      <div
        v-if="!isLive && hasCurrent && current"
        class="live-card__viewer-info"
      >
        <p class="live-card__now">Сейчас в эфире</p>
        <p class="live-card__viewer-name">
          {{ currentName }}
        </p>
        <p v-if="formattedStartedAt" class="live-card__viewer-time">
          в эфире с {{ formattedStartedAt }}
        </p>

        <div class="live-card__viewer-actions">
          <button
            type="button"
            class="live-card__watch-btn"
            :disabled="viewerLoading"
            @click="openStreamPanel"
          >
            Смотреть эфир
          </button>

          <button
            type="button"
            class="live-card__profile-btn"
            @click="goToProfile"
          >
            В профиль
          </button>
        </div>
      </div>

      <!-- 3. Никто не в эфире -->
      <div
        v-if="!isLive && (!hasCurrent || !current)"
        class="live-card__placeholder"
      >
        <span class="live-card__badge live-card__badge--idle">Эфир</span>
        <p>
          Сейчас нет активных эфиров или мы ещё ищем для вас что-то
          интересное…
        </p>
      </div>
    </div>
  </section>

  <!-- Выезжающая справа панель просмотра эфира -->
  <transition name="live-viewer">
    <div
      v-if="isViewerOpen && current"
      class="live-viewer-backdrop"
      @click.self="closeStreamPanel"
    >
      <aside class="live-viewer">
        <div class="live-viewer__header">
          <div class="live-viewer__title-group">
            <div class="live-viewer__title">
              Эфир {{ currentName }}
            </div>
            <div
              v-if="formattedStartedAt"
              class="live-viewer__subtitle"
            >
              в эфире с {{ formattedStartedAt }}
            </div>
          </div>

          <button
            type="button"
            class="live-viewer__close"
            @click="closeStreamPanel"
          >
            ✕
          </button>
        </div>

        <div class="live-viewer__body">
          <div class="live-viewer__video-wrapper">
            <video
              ref="viewerVideoEl"
              class="live-viewer__video"
              autoplay
              playsinline
            ></video>
          </div>

          <button
            type="button"
            class="live-viewer__profile-btn"
            @click="goToProfile"
          >
            Перейти в профиль
          </button>
        </div>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useRouter } from '#imports'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

const router = useRouter()

// мой собственный эфир
const { isLive, busy, videoEl, loadInitial, startLive, stopLive } =
  useMyLive()

// список чужих эфиров
const {
  current,
  hasCurrent,
  loading: liveLoading,
  startRotation,
  stopRotation,
} = useLiveNow()

// просмотр чужого эфира
const isViewerOpen = ref(false)
const {
  videoEl: viewerVideoEl,
  isWatching,
  loading: viewerLoading,
  startWatching,
  stopWatching,
} = useLiveViewer()

const currentName = computed(
  () =>
    current.value?.username ||
    current.value?.email ||
    'Пользователь',
)

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

async function openStreamPanel() {
  if (!current.value) return
  isViewerOpen.value = true
  await nextTick()
  await startWatching(current.value.id)
}

async function closeStreamPanel() {
  isViewerOpen.value = false
  if (isWatching.value) {
    await stopWatching()
  }
}

onMounted(() => {
  loadInitial()
  startRotation()
})

onBeforeUnmount(() => {
  stopRotation()
  void stopWatching()
})

// если текущий стрим исчез — закрываем панель
watch(current, (val) => {
  if (!val && isViewerOpen.value) {
    void closeStreamPanel()
  }
})
</script>