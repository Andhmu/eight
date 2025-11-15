<!-- layouts/default.vue -->

<template>

  <div>

    <header class="header">

      <NuxtLink :to="homePath" class="brand">eight ∞</NuxtLink>

<nav class="nav">

  <template v-if="user">

    <NuxtLink to="/feed" class="link">Лента</NuxtLink>

    <NuxtLink to="/profile" class="link">Профиль</NuxtLink>

    <button class="btn btn--light" @click="doSignOut">Выйти</button>

  </template>

</nav>

    </header>

    <main class="page">

      <slot />

    </main>

  </div>

</template>



<script setup lang="ts">

import { computed } from 'vue'

import { useAuth } from '~/composables/auth/useAuth'



const user = useSupabaseUser()

const router = useRouter()

const { signOut } = useAuth()



const homePath = computed(() => (user.value ? '/feed' : '/'))



async function doSignOut() {

  const ok = await signOut()

  if (ok) router.push('/auth/login')

}

</script>