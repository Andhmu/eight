<!-- components/feed/NewUsersCarousel.vue -->
<template>
  <section class="new-users">
    <div class="new-users__header">
      <!-- Поле поиска -->
      <input
        v-model="search"
        type="search"
        class="new-users__search"
        placeholder="Поиск пользователя"
      />

      <button
        v-if="!loading && users.length"
        type="button"
        class="new-users__refresh"
        @click="refresh"
      >
        Обновить
      </button>
    </div>

    <!-- Ошибка загрузки -->
    <div v-if="error" class="new-users__error">
      Не удалось загрузить пользователей: {{ error }}
    </div>

    <!-- Состояние "загрузка" -->
    <div v-else-if="loading" class="new-users__loading">
      Загрузка пользователей…
    </div>

    <!-- Если вообще нет пользователей и поиск пустой -->
    <div v-else-if="!users.length && !search.trim()" class="new-users__empty">
      Пока никто не присоединился — но это вопрос времени.
    </div>

    <div v-else>
      <!-- Если поиск включён и никого не нашли -->
      <div
        v-if="!users.length && search.trim()"
        class="new-users__empty"
      >
        Никого не нашли по запросу «{{ search.trim() }}».
      </div>

      <!-- Вьюпорт карусели с "drag мышью" -->
      <div
        v-else
        ref="viewportRef"
        class="new-users__viewport"
        @mousemove="onMouseMove"
        @mouseleave="resetDrag"
        @mouseenter="resetDrag"
      >
        <div class="new-users__list">
          <NuxtLink
            v-for="user in users"
            :key="user.id"
            :to="{ name: 'profile-id', params: { id: user.id } }"
            class="new-users__item"
          >
            <div class="new-users__avatar">
              <span class="new-users__avatar-fallback">
                {{ userInitial(user) }}
              </span>
            </div>

            <div class="new-users__name">
              {{ user.username || 'Новый пользователь' }}
            </div>

            <div class="new-users__since">
              с {{ formatDate(user.created_at) }}
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useNewUsers } from '~/composables/feed/useNewUsers'

const { users, loading, error, fetchUsers } = useNewUsers()

const search = ref('')

// ссылка на вьюпорт карусели
const viewportRef = ref<HTMLElement | null>(null)
// последняя позиция мыши по X для "drag"
const lastX = ref<number | null>(null)

onMounted(() => {
  // первый запрос — просто последние пользователи
  fetchUsers()
})

/**
 * Поиск по всей базе: при изменении строки поиска
 * отправляем запрос на сервер (с лёгким debounce).
 */
let timer: number | null = null

watch(
  search,
  (value) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fetchUsers(value)
    }, 300)
  },
  { immediate: false },
)

const refresh = () => {
  if (!loading.value) fetchUsers(search.value)
}

const userInitial = (user: any) => {
  const name = user.username || ''
  if (!name) return '∞'
  return name.trim().charAt(0).toUpperCase()
}

const formatDate = (value: string | null) => {
  if (!value) return 'сегодня'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return 'сегодня'
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/**
 * Эффект: двигаем карусель при движении мыши.
 *
 * Нужно:
 *   мышь вправо  → карточки визуально влево  → scrollLeft ДОЛЖЕН УВЕЛИЧИВАТЬСЯ
 *   мышь влево  → карточки визуально вправо → scrollLeft ДОЛЖЕН УМЕНЬШАТЬСЯ
 */
const onMouseMove = (event: MouseEvent) => {
  const el = viewportRef.value
  if (!el) return

  const currentX = event.clientX

  if (lastX.value === null) {
    lastX.value = currentX
    return
  }

  const dx = currentX - lastX.value
  lastX.value = currentX

  const speed = 1 // можешь поставить 0.7 если захочешь мягче

  // ВАЖНО: меняем знак на "+="
  // dx > 0 (мышь вправо) → scrollLeft += dx → контент уезжает влево
  el.scrollLeft += dx * speed
}

const resetDrag = () => {
  lastX.value = null
}
</script>