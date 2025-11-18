<!-- components/feed/LiveNowBlock.vue -->
<template>
  <section class="live-now">
    <!-- Оборачиваем всё в ту же карточку, что и лента -->
    <article class="feed-card live-now__card">
      <div class="feed-card__header live-now__header">
        <h2 class="feed-card__title live-now__title">Прямой эфир</h2>

        <!-- Кнопка "транслировать меня" / "завершить эфир" -->
        <button
          v-if="!isLive"
          type="button"
          class="live-now__go-live"
          @click="startLive"
          :disabled="busy"
        >
          Транслировать меня
        </button>
        <button
          v-else
          type="button"
          class="live-now__go-live live-now__go-live--stop"
          @click="stopLive"
          :disabled="busy"
        >
          Завершить эфир
        </button>
      </div>

      <div class="feed-card__body live-now__body">
        <!-- ЕСЛИ Я В ЭФИРЕ → показываем мой превью -->
        <div v-if="isLive" class="live-now__player">
          <div class="live-now__video">
            <div class="live-now__badge live-now__badge--live">
              ВЫ В ЭФИРЕ
            </div>

            <video
              ref="videoEl"
              class="live-now__video-element"
              autoplay
              muted
              playsinline
            ></video>

            <p class="live-now__hint live-now__hint--self">
              Ваш эфир сейчас виден другим пользователям в блоке «Прямой эфир».
            </p>
          </div>
        </div>

        <!-- ЕСЛИ Я НЕ В ЭФИРЕ → режим просмотра чужого эфира -->
        <template v-else>
          <div v-if="error" class="live-now__error">
            Не удалось загрузить эфир: {{ error }}
          </div>

          <div v-else-if="loading || !current">
            <div class="live-now__placeholder">
              <span class="live-now__badge">Эфир</span>
              <p class="live-now__placeholder-text">
                Сейчас нет активных эфиров или мы ещё ищем для вас что-то
                интересное…
              </p>
            </div>
          </div>

          <div v-else class="live-now__player">
            <div class="live-now__video live-now__video--placeholder">
              <div class="live-now__badge live-now__badge--live">
                LIVE
              </div>

              <p class="live-now__video-text">
                Идёт эфир пользователя
              </p>
              <button
                type="button"
                class="live-now__host"
                @click="goToProfile(current.id)"
              >
                @{{ current.username || 'user' }}
              </button>
              <p class="live-now__hint">
                Нажмите на логин, чтобы продолжить смотреть на странице профиля.
              </p>
            </div>

            <div class="live-now__meta">
              <span class="live-now__meta-label">Случайный эфир</span>
              <span class="live-now__meta-rotate">
                эфир сменится через несколько секунд
              </span>
            </div>
          </div>
        </template>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from '#imports'
import { useLiveNow } from '~/composables/feed/useLiveNow'
import { useMyLive } from '~/composables/live/useMyLive'

const router = useRouter()

// случайный текущий эфир (другие пользователи)
const { current, loading, error, init } = useLiveNow()

// мой эфир
const {
  isLive,
  busy,
  videoEl,
  loadInitial,
  startLive,
  stopLive,
} = useMyLive()

onMounted(async () => {
  await loadInitial()
  await init()
})

function goToProfile(id: string) {
  router.push({ name: 'profile-id', params: { id } })
}
</script>
