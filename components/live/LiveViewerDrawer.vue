<!-- components/live/LiveViewerDrawer.vue -->
<template>
  <transition name="live-viewer">
    <div class="live-viewer-backdrop" @click.self="emit('close')">
      <aside class="live-viewer">
        <header class="live-viewer__header">
          <div class="live-viewer__title-block">
            <h3 class="live-viewer__title">
              Эфир пользователя
              {{ profile.display_name || shortEmail }}
            </h3>
            <p class="live-viewer__subtitle">
              Вы смотрите эфир как гость.
            </p>
          </div>

          <button
            type="button"
            class="live-viewer__close"
            @click="emit('close')"
          >
            ✕
          </button>
        </header>

        <section class="live-viewer__body">
          <div class="live-viewer__video-placeholder">
            <!-- сюда позже прикрутим реальное видео через WebRTC -->
            <p>
              Здесь будет трансляция пользователя
              <b>{{ profile.display_name || shortEmail }}</b>.
            </p>
            <p class="live-viewer__note">
              Сейчас мы уже показываем, кто в эфире и когда он начался.
              В следующем шаге подключим реальный видеопоток.
            </p>
          </div>

          <div class="live-viewer__info">
            <p><b>Email:</b> {{ profile.email }}</p>
            <p v-if="profile.live_started_at">
              <b>В эфире с:</b> {{ formatTime(profile.live_started_at) }}
            </p>
          </div>
        </section>
      </aside>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface LiveProfile {
  id: string
  display_name: string | null
  email: string | null
  live_started_at?: string | null
}

const props = defineProps<{
  profile: LiveProfile
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const shortEmail = computed(() => {
  if (!props.profile.email) return 'гость'
  return props.profile.email.split('@')[0] || props.profile.email
})

function formatTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}
</script>
