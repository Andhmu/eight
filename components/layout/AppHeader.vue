<!-- components/layout/AppHeader.vue -->
<template>
  <header class="site-header">
    <!-- Верхняя тонкая панель: баланс + время жизни -->
<div
  v-if="time.totalSeconds > 0"
  class="header-meta"
>
  <span class="header-meta__label">Мой баланс:&nbsp;</span>

  <span class="header-meta__value">
    {{ time.years }} г ·
    {{ time.months }} мес ·
    {{ time.weeks }} нед ·
    {{ time.days }} дн ·
    {{ timeText }}
  </span>
</div>

    <!-- Верхняя полоса: счётчик слева, логотип ∞ справа -->
    <div class="header-top">
      <CoinsPill />

      <NuxtLink :to="homePath" class="brand">
        ∞
      </NuxtLink>
    </div>

    <!-- Нижняя полоса: меню справа -->
    <div class="header-bottom">
      <nav class="nav">
        <NuxtLink to="/feed" class="nav-link">Лента</NuxtLink>

        <button
          type="button"
          class="nav-link nav-link-button"
          @click="$emit('open-profile-menu')"
        >
          Профиль
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CoinsPill from '~/components/coins/CoinsPill.vue'
import { useCoins } from '~/composables/coins/useCoins'

defineEmits<{
  (e: 'open-profile-menu'): void
}>()

// Общий сервис коинов (тот же, что и в layout)
const { coins } = useCoins()

// Путь для логотипа в шапке
const homePath = computed(() => '/feed')

/**
 * Разбиваем общее количество коинов (секунд)
 * на годы / месяцы / недели / дни / часы / минуты / секунды
 */
const time = computed(() => {
  const totalSeconds = Math.max(0, Number(coins.value ?? 0))

  let rest = totalSeconds

  const secondsInMinute = 60
  const secondsInHour = 60 * secondsInMinute
  const secondsInDay = 24 * secondsInHour
  const secondsInWeek = 7 * secondsInDay
  const secondsInMonth = 30 * secondsInDay     // упрощённо: 30 дней
  const secondsInYear = 365 * secondsInDay     // упрощённо: 365 дней

  const years = Math.floor(rest / secondsInYear)
  rest -= years * secondsInYear

  const months = Math.floor(rest / secondsInMonth)
  rest -= months * secondsInMonth

  const weeks = Math.floor(rest / secondsInWeek)
  rest -= weeks * secondsInWeek

  const days = Math.floor(rest / secondsInDay)
  rest -= days * secondsInDay

  const hours = Math.floor(rest / secondsInHour)
  rest -= hours * secondsInHour

  const minutes = Math.floor(rest / secondsInMinute)
  const seconds = rest - minutes * secondsInMinute

  return {
    totalSeconds,
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
  }
})

/**
 * Форматируем нижнюю часть в вид HH:MM:SS
 */
const timeText = computed(() => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(time.value.hours)}:${pad(time.value.minutes)}:${pad(
    time.value.seconds,
  )}`
})
</script>
