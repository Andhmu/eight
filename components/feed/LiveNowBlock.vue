<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <!-- Заголовок + кнопка моего эфира -->
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <button
        v-if="!isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="myBusy"
        @click="startLive"
      >
        Транслировать меня
      </button>

      <button
        v-else
        type="button"
        class="live-card__action live-card__action--stop"
        :disabled="myBusy"
        @click="stopLive"
      >
        Завершить эфир
      </button>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- МОЙ ЭФИР -->
      <div v-if="isLive" class="live-card__video-wrapper">
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

      <!-- КТО СЕЙЧАС В ЭФИРЕ (для просмотра) -->
      <div class="live-card__now">
        <h3 class="live-card__now-title">Сейчас в эфире</h3>

        <div v-if="liveLoading" class="live-card__now-placeholder">
          Ищем для вас интересный эфир…
        </div>

        <div
          v-else-if="currentLive"
          class="live-card__now-card"
        >
          <div class="live-card__now-main">
            <div class="live-card__now-name">
              <span class="live-card__now-letter">
                {{ currentLive.email?.[0]?.toUpperCase() || 'U' }}
              </span>
              <div class="live-card__now-text">
                <div class="live-card__now-login">
                  {{ currentLive.email || 'Без почты' }}
                </div>
                <div class="live-card__now-time">
                  в эфире с
                  {{ formatTime(currentLive.live_started_at) }}
                </div>
              </div>
            </div>

            <button
              type="button"
              class="live-card__now-watch"
              :disabled="viewerBusy"
              @click="openViewer(currentLive)"
            >
              Перейти на стрим
            </button>
          </div>

          <p class="live-card__now-sub">
            Нажмите, чтобы открыть эфир во выезжающей панели.
          </p>
        </div>

        <div v-else class="live-card__now-placeholder">
          Сейчас нет активных эфиров или мы ещё ищем что-то интересное…
        </div>
      </div>
    </div>

    <!-- ПРАВАЯ ВЫЕЗЖАЮЩАЯ ПАНЕЛЬ ЗРИТЕЛЯ -->
    <transition name="profile-menu">
      <div
        v-if="viewerOpen && viewerUser"
        class="profile-menu-backdrop"
        @click.self="closeViewer"
      >
        <aside class="profile-menu live-viewer">
          <div class="profile-menu__header">
            <span class="profile-menu__title">
              Эфир пользователя
            </span>
            <button
              type="button"
              class="profile-menu__close"
              @click="closeViewer"
            >
              ✕
            </button>
          </div>

          <div class="live-viewer__info">
            <div class="live-viewer__avatar">
              {{ viewerUser.email?.[0]?.toUpperCase() || 'U' }}
            </div>
            <div class="live-viewer__meta">
              <div class="live-viewer__login">
                {{ viewerUser.email || 'Без почты' }}
              </div>
              <div class="live-viewer__time">
                в эфире с
                {{ formatTime(viewerUser.live_started_at) }}
              </div>
            </div>
          </div>

          <div class="live-viewer__video-wrap">
            <video
              ref="viewerVideoEl"
              class="live-viewer__video"
              autoplay
              playsinline
            ></video>
          </div>
        </aside>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow, type LiveCandidate } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

/* === МОЙ ЭФИР === */
const {
  isLive,
  busy: myBusy,
  videoEl: myVideoEl,
  loadInitial,
  startLive,
  stopLive,
} = useMyLive()

/* === РАНДОМНЫЙ СТРЕМЕР ДЛЯ ПРОСМОТРА === */
const {
  currentLive,
  loading: liveLoading,
  startRotation,
} = useLiveNow()

/* === ЗРИТЕЛЬ (подключение к чужому эфиру) === */
const {
  isWatching,
  busy: viewerBusy,
  videoEl: viewerVideoEl,
  startViewing,
  stopViewing,
} = useLiveViewer()

const viewerOpen = ref(false)
const viewerUser = ref<LiveCandidate | null>(null)

function openViewer(user: LiveCandidate) {
  viewerUser.value = user
  viewerOpen.value = true
  startViewing(user.id)
}

function closeViewer() {
  viewerOpen.value = false
  viewerUser.value = null
  if (isWatching.value) {
    stopViewing()
  }
}

function formatTime(ts: string | null): string {
  if (!ts) return 'неизвестно'
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

onMounted(() => {
  loadInitial()
  startRotation()
})
</script>