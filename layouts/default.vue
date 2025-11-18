<!-- layouts/default.vue -->
<template>
  <div>
    <header class="site-header">
      <!-- Верхняя часть шапки: счётчик слева, ∞ справа (только авторизован) -->
      <div v-if="user" class="header-top">
        <!-- Счётчик: кликаем — открывается панель баланса -->
        <button
          type="button"
          class="header-coins-btn"
          @click="openBalance"
        >
          <CoinsPill />
        </button>

        <!-- Логотип ∞ справа -->
        <NuxtLink :to="homePath" class="brand">
          ∞
        </NuxtLink>
      </div>

      <!-- Нижняя полоса: меню справа (только авторизован) -->
      <div v-if="user" class="header-bottom">
        <nav class="nav">
          <NuxtLink to="/feed" class="nav-link">Лента</NuxtLink>

          <!-- Профиль: открывает правое меню -->
          <button
            type="button"
            class="nav-link nav-link-button"
            @click="openProfileMenu"
          >
            Профиль
          </button>
        </nav>
      </div>
    </header>

    <!-- 🔽 ВЕРХНЯЯ ПАНЕЛЬ БАЛАНСА (по клику на счётчик) -->
    <transition name="balance-panel">
      <div
        v-if="user && isBalanceOpen"
        class="balance-panel-backdrop"
        @click.self="closeBalance"
      >
        <section class="balance-panel">
          <div class="balance-panel__header">
            <span class="balance-panel__title">Мой баланс</span>
            <button
              type="button"
              class="balance-panel__close"
              @click="closeBalance"
            >
              ✕
            </button>
          </div>

          <div class="balance-panel__body">
            <p class="balance-panel__coins">
              Всего: <b>{{ coinsValue }}</b> эйтов
            </p>

            <p class="balance-panel__line">
              {{ time.years }} лет ·
              {{ time.months }} мес ·
              {{ time.weeks }} нед ·
              {{ time.days }} дн ·
              {{ time.hours }} ч ·
              {{ time.minutes }} мин ·
              {{ time.seconds }} сек
            </p>
          </div>
        </section>
      </div>
    </transition>

    <!-- 👉 Правое выезжающее меню профиля -->
    <transition name="profile-menu">
      <div
        v-if="user && isProfileMenuOpen"
        class="profile-menu-backdrop"
        @click.self="closeProfileMenu"
      >
        <aside class="profile-menu">
          <div class="profile-menu__header">
            <span class="profile-menu__title">Профиль</span>
            <button
              type="button"
              class="profile-menu__close"
              @click="closeProfileMenu"
            >
              ✕
            </button>
          </div>

          <button
            type="button"
            class="profile-menu__item"
            @click="goToCover"
          >
            Моя обложка
          </button>

          <button
            type="button"
            class="profile-menu__item"
            @click="goToProfileSettings"
          >
            Настройки профиля
          </button>

          <button
            type="button"
            class="profile-menu__item profile-menu__item--danger"
            @click="handleLogout"
          >
            Выйти
          </button>
        </aside>
      </div>
    </transition>

    <main class="page">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CoinsPill from '~/components/coins/CoinsPill.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useCoins } from '~/composables/coins/useCoins'

const user = useSupabaseUser()
const router = useRouter()
const { signOut } = useAuth()
const coinsService = useCoins()

const isProfileMenuOpen = ref(false)
const isBalanceOpen = ref(false)

const homePath = computed(() => (user.value ? '/feed' : '/'))

// Привязка сервиса коинов к авторизации
watch(
  user,
  async (u) => {
    if (!process.client) return

    const raw = u as any
    const userId = raw?.id ?? raw?.sub

    if (userId) {
      await coinsService.initForUser(userId)
    } else {
      coinsService.reset()
      isBalanceOpen.value = false
      isProfileMenuOpen.value = false
    }
  },
  { immediate: true },
)

const coinsValue = computed(() => {
  const v = (coinsService as any).coins?.value ?? 0
  return Math.max(0, Math.floor(v))
})

const time = computed(() => {
  const totalSeconds = coinsValue.value
  let remaining = totalSeconds

  const SEC_IN_MIN = 60
  const SEC_IN_HOUR = 60 * SEC_IN_MIN
  const SEC_IN_DAY = 24 * SEC_IN_HOUR
  const SEC_IN_WEEK = 7 * SEC_IN_DAY
  const SEC_IN_MONTH = 30 * SEC_IN_DAY
  const SEC_IN_YEAR = 365 * SEC_IN_DAY

  const years = Math.floor(remaining / SEC_IN_YEAR)
  remaining -= years * SEC_IN_YEAR

  const months = Math.floor(remaining / SEC_IN_MONTH)
  remaining -= months * SEC_IN_MONTH

  const weeks = Math.floor(remaining / SEC_IN_WEEK)
  remaining -= weeks * SEC_IN_WEEK

  const days = Math.floor(remaining / SEC_IN_DAY)
  remaining -= days * SEC_IN_DAY

  const hours = Math.floor(remaining / SEC_IN_HOUR)
  remaining -= hours * SEC_IN_HOUR

  const minutes = Math.floor(remaining / SEC_IN_MIN)
  remaining -= minutes * SEC_IN_MIN

  const seconds = remaining

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

function openProfileMenu() {
  isProfileMenuOpen.value = true
}

function closeProfileMenu() {
  isProfileMenuOpen.value = false
}

function openBalance() {
  if (!coinsValue.value) return
  isBalanceOpen.value = true
}

function closeBalance() {
  isBalanceOpen.value = false
}

async function goToCover() {
  closeProfileMenu()
  await router.push('/profile')
}

async function goToProfileSettings() {
  closeProfileMenu()
  await router.push('/profile')
}

async function handleLogout() {
  await coinsService.saveCoins()
  const ok = await signOut()
  closeProfileMenu()
  closeBalance()
  if (ok) {
    router.push('/')
  }
}
</script>
