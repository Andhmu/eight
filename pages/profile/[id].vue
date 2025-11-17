<!-- pages/profile/[id].vue -->
<template>
  <div class="profile-page">
    <!-- Состояние загрузки -->
    <div v-if="pending" class="card profile-card">
      <h2>Профиль</h2>
      <p>Загружаем профиль…</p>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="card profile-card">
      <h2>Профиль</h2>
      <p class="error">
        Не удалось загрузить профиль: {{ errorMessage }}
      </p>
    </div>

    <!-- Профиль найден -->
    <div v-else-if="profile" class="card profile-card">
      <header class="profile-card__header">
        <div class="profile-card__avatar">
          <span class="profile-card__avatar-fallback">
            {{ initial }}
          </span>
        </div>

        <div class="profile-card__header-text">
          <div class="profile-card__badge">Гостевой профиль</div>
          <h2 class="profile-card__name">
            {{ profile.username || 'Пользователь' }}
          </h2>
          <p class="profile-card__meta">
            В eight с {{ formattedDate }}
          </p>
        </div>
      </header>

      <section class="profile-card__body">
        <p class="profile-card__placeholder">
          Здесь позже появится публичная информация о пользователе:
          обложка, описание, активность и другое. Сейчас это просто
          гостевой просмотр профиля.
        </p>
      </section>
    </div>

    <!-- Профиль не найден -->
    <div v-else class="card profile-card">
      <h2>Профиль не найден</h2>
      <p>Похоже, такого пользователя ещё нет. Возможно, ссылка устарела.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useSupabaseClient, useAsyncData, definePageMeta } from '#imports'

definePageMeta({ middleware: ['auth-only'] })

const route = useRoute()
const client = useSupabaseClient()

const userId = computed(() => String(route.params.id))

const {
  data: profile,
  pending,
  error,
} = await useAsyncData(`guest-profile-${userId.value}`, async () => {
  const { data, error } = await client
    .from('profiles')
    .select('id, username, email, created_at')
    .eq('id', userId.value)
    .maybeSingle()

  if (error) throw error
  return data
})

const errorMessage = computed(() => {
  if (!error.value) return ''
  // @ts-ignore
  return error.value.message || String(error.value)
})

const initial = computed(() => {
  const p: any = profile.value
  if (!p) return '∞'
  const base = p.username || p.email || ''
  if (!base) return '∞'
  return base.trim().charAt(0).toUpperCase()
})

const formattedDate = computed(() => {
  const p: any = profile.value
  if (!p || !p.created_at) return 'сегодня'
  const d = new Date(p.created_at)
  if (Number.isNaN(d.getTime())) return 'сегодня'
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
})
</script>