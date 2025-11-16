<!-- layouts/default.vue -->
<template>
  <div>
    <!-- Шапка показывается только в авторизованном состоянии -->
    <AppHeader
      v-if="user"
      @open-profile-menu="openProfileMenu"
    />

    <!-- Правое выезжающее меню профиля -->
    <ProfileMenu
      v-if="user && isProfileMenuOpen"
      @close="closeProfileMenu"
      @go-cover="goToCover"
      @go-settings="goToProfileSettings"
      @logout="handleLogout"
    />

    <!-- Основной контент -->
    <main class="page">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/* ===============================
   ИМПОРТЫ
   =============================== */
import { computed, ref, watch } from 'vue'
import AppHeader from '~/components/layout/AppHeader.vue'
import ProfileMenu from '~/components/layout/ProfileMenu.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useCoins } from '~/composables/coins/useCoins'

/* ===============================
   СОСТОЯНИЕ
   =============================== */
const user = useSupabaseUser()
const router = useRouter()
const { signOut } = useAuth()
const coinsService = useCoins()

const isProfileMenuOpen = ref(false)

/* ===============================
   ПРИВЯЗКА КОИНОВ К АВТОРИЗАЦИИ
   =============================== */
watch(
  user,
  async (u) => {
    if (!process.client) return

    const raw = u as any
    const userId = raw?.id ?? raw?.sub // берём id или sub

    if (userId) {
      await coinsService.initForUser(userId)
    } else {
      coinsService.reset()
    }
  },
  { immediate: true },
)

/* ===============================
   МЕТОДЫ ДЛЯ МЕНЮ ПРОФИЛЯ
   =============================== */
function openProfileMenu() {
  isProfileMenuOpen.value = true
}

function closeProfileMenu() {
  isProfileMenuOpen.value = false
}

async function goToCover() {
  closeProfileMenu()
  await router.push('/profile') // позже можно сделать отдельный маршрут
}

async function goToProfileSettings() {
  closeProfileMenu()
  await router.push('/profile') // тоже можно развести по роутам потом
}

async function handleLogout() {
  await coinsService.saveCoins()
  const ok = await signOut()
  closeProfileMenu()
  if (ok) {
    router.push('/')
  }
}
</script>
