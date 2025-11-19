<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="feed-card live-card">
    <div class="feed-card__header live-card__header">
      <h2 class="feed-card__title">Прямой эфир</h2>

      <!-- Кнопка "транслировать меня" / "завершить эфир" -->
      <button
        v-if="!my.isLive"
        type="button"
        class="live-card__action live-card__action--start"
        :disabled="my.busy"
        @click="my.startLive"
      >
        Транслировать меня
      </button>
      <button
        v-else
        type="button"
        class="live-card__action live-card__action--stop"
        :disabled="my.busy"
        @click="my.stopLive"
      >
        Завершить эфир
      </button>
    </div>

    <div class="feed-card__body live-card__body">
      <!-- Мой эфир (превью) -->
      <div v-if="my.isLive" class="live-card__video-wrapper">
        <span class="live-card__badge">ВЫ В ЭФИРЕ</span>
        <video
          ref="myVideo"
          class="live-card__player"
          autoplay
          muted
          playsinline
        ></video>
        <p class="live-card__hint">
          Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
        </p>
      </div>

      <!-- Если сам не в эфире — показываем текущего стримера -->
      <div v-else class="live-card__viewer">
        <p v-if="now.loading">Ищем интересный эфир…</p>

        <template v-else-if="now.current">
          <p class="live-card__text">
            Сейчас в эфире
            <b>{{ now.current.display_name || now.current.email }}</b>
            <span class="live-card__since" v-if="now.current.live_started_at">
              с {{ formatTime(now.current.live_started_at) }}
            </span>
          </p>

          <div class="live-card__viewer-actions">
            <button
              type="button"
              class="live-card__action live-card__action--watch"
              @click="openViewer"
            >
              Смотреть эфир
            </button>

            <NuxtLink
              class="live-card__profile-link"
              :to="`/profile/${now.current.id}`"
            >
              Профиль как гость
            </NuxtLink>
          </div>
        </template>

        <p v-else class="live-card__text">
          Сейчас нет активных эфиров или мы ещё ищем для вас что-то
          интересное…
        </p>
      </div>
    </div>

    <!-- Выезжающая справа панель со стримом другого пользователя -->
    <transition name="profile-menu">
      <div
        v-if="viewerOpen && now.current"
        class="profile-menu-backdrop"
        @click.self="closeViewer"
      >
        <aside class="profile-menu live-viewer">
          <div class="profile-menu__header">
            <span class="profile-menu__title">
              Эфир —
              {{ now.current.display_name || now.current.email }}
            </span>
            <button
              type="button"
              class="profile-menu__close"
              @click="closeViewer"
            >
              ✕
            </button>
          </div>

          <div class="live-viewer__video-wrap">
            <video
              ref="viewerVideo"
              class="live-viewer__video"
              autoplay
              playsinline
            ></video>
          </div>

          <p v-if="viewer.errorText" class="error" style="margin-top:8px">
            {{ viewer.errorText }}
          </p>
        </aside>
      </div>
    </transition>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useMyLive } from '~/composables/live/useMyLive'
import { useLiveNow } from '~/composables/live/useLiveNow'
import { useLiveViewer } from '~/composables/live/useLiveViewer'

const my = useMyLive()
const now = useLiveNow()

const viewerOpen = ref(false)

const myVideo = my.videoEl

// текущий id стримера для просмотра (если панель открыта)
const currentStreamerId = computed(() => (viewerOpen.value && now.current ? now.current.id : null))

const viewer = useLiveViewer(() => currentStreamerId.value)
const viewerVideo = viewer.videoEl

onMounted(() => {
  my.loadInitial()
  now.startRotation()
})

function openViewer() {
  viewerOpen.value = true
  viewer.startWatching()
}

function closeViewer() {
  viewerOpen.value = false
  viewer.stopWatching()
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
