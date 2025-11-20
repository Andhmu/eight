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
      <!-- Мой эфир — блок всегда в DOM, только прячем/показываем -->
      <div v-show="isLive" class="live-card__my-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>

        <video
          ref="myVideoEl"
          class="live-card__player"
          autoplay
          muted
          playsinline
        ></video>

        <p class="live-card__hint">
          Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
        </p>
      </div>

      <!-- Когда я не в эфире — показываем случайный чужой эфир / заглушку -->
      <div v-show="!isLive">
        <div v-if="currentLive" class="live-card__current">
          <p class="live-card__text">
            Сейчас в эфире
            <b>{{ currentName }}</b>
            <span v-if="startedAt">
              &nbsp;— в эфире с {{ startedAt }}
            </span>
          </p>

          <button
            type="button"
            class="live-card__watch-btn"
            :disabled="viewerBusy"
            @click="openViewer"
          >
            Перейти к трансляции
          </button>
        </div>

        <div v-else class="live-card__placeholder">
          <span class="live-card__badge live-card__badge--idle">Эфир</span>
          <p>
            Сейчас нет активных эфиров или мы ещё ищем для вас что-то интересное…
          </p>
        </div>
      </div>
    </div>

    <!-- Выезжающая панель просмотра чужого эфира -->
    <transition name="live-viewer">
      <div
        v-if="isViewerOpen && currentLive"
        class="live-viewer-backdrop"
        @click.self="closeViewer"
      >
        <aside class="live-viewer-panel">
          <div class="live-viewer__header">
            <span class="live-viewer__title">
              Эфир {{ currentName }}
            </span>
            <button
              type="button"
              class="live-viewer__close"
              @click="closeViewer"
            >
              ✕
            </button>
          </div>

          <div class="live-viewer__body">
            <video
              ref="viewerVideoEl"
              class="live-viewer__player"
              autoplay
              playsinline
            ></video>

            <p v-if="viewerError" class="live-viewer__error">
              {{ viewerError }}
            </p>
            <p v-else-if="!isWatchingViewer" class="live-viewer__note">
              Подключаемся к эфиру…
            </p>
          </div>
        </aside>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

// Мой эфир
const {
  isLive,
  busy,
  videoEl: myVideoEl,
  loadInitial,
  startLive,
  stopLive,
} = useMyLive()

// Кандидаты «кто сейчас в эфире»
const { current, startRotation, stopRotation } = useLiveNow()

// Просмотр чужого эфира
const {
  videoEl: viewerVideoEl,
  isWatching: isWatchingViewer,
  busy: viewerBusy,
  error: viewerError,
  startWatching,
  stopWatching,
} = useLiveViewer()

const isViewerOpen = ref(false)

const currentLive = computed(() => current.value)

const currentName = computed(() => {
  if (!currentLive.value) return ''
  return currentLive.value.email ?? currentLive.value.id
})

const startedAt = computed(() => {
  if (!currentLive.value?.live_started_at) return ''
  const dt = new Date(currentLive.value.live_started_at)
  return dt.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function openViewer() {
  if (!currentLive.value) return
  isViewerOpen.value = true
  await startWatching(currentLive.value.id)
}

async function closeViewer() {
  isViewerOpen.value = false
  await stopWatching()
}

onMounted(async () => {
  await loadInitial()
  startRotation()
})

onUnmounted(() => {
  stopRotation()
  void stopWatching()
})
</script>