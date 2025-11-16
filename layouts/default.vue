<!-- layouts/default.vue -->
<template>
  <div>
    <header class="header">
      <div class="header_left">
        <NuxtLink :to="homePath" class="brand">
          eight ∞
        </NuxtLink>

        <!-- Блок с коинами (сам скрывается, если юзера нет) -->
        <CoinsPill />
      </div>

      <nav v-if="user" class="nav">
        <NuxtLink to="/feed" class="link">Лента</NuxtLink>
        <NuxtLink to="/profile" class="link">Профиль</NuxtLink>
        <button class="btn btn-light" type="button" @click="doSignOut">
          Выйти
        </button>
      </nav>
    </header>

    <main class="page">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue'
import CoinsPill from '~/components/coins/CoinsPill.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useCoins } from '~/composables/coins/useCoins'

const user = useSupabaseUser()
const router = useRouter()
const { signOut } = useAuth()
const coinsService = useCoins()

const homePath = computed(() => (user.value ? '/feed' : '/'))

// Просто смотрим, что реально лежит в user
watchEffect(() => {
  console.log('[layout] user =', user.value)
})

// Привязываем сервис коинов к авторизации,
// но берем userId не только из id, но и из sub
watch(
  user,
  async (u) => {
    if (!process.client) return

    const raw = u as any
    const userId = raw?.id ?? raw?.sub // ← ВАЖНО: берём sub, если id нет

    console.log('[layout] computed userId =', userId)

    if (userId) {
      await coinsService.initForUser(userId)
    } else {
      coinsService.reset()
    }
  },
  { immediate: true },
)

async function doSignOut() {
  await coinsService.saveCoins()
  const ok = await signOut()
  if (ok) {
    router.push('/')
  }
}
</script>