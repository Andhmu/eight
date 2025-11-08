<!-- pages/index.vue -->

<template>

  <div class="stack" @mousemove="handleMove">

    <div class="brand-big" :style="logoStyle">eight ∞</div>



    <LoginForm

      title="Вход"

      submitText="Войти"

      :showForgot="true"

      :showSignup="true"

      @submit="login"

    />

  </div>

</template>



<script setup lang="ts">

import { ref, computed } from 'vue'

import LoginForm from '~/components/LoginForm.vue'

import { useAuth } from '~/composables/UseAuth'



/* параллакс логотипа */

const x = ref(0), y = ref(0)

function handleMove(e: MouseEvent) {

  const cx = innerWidth / 2, cy = innerHeight / 2

  x.value = (e.clientX - cx) * 0.02

  y.value = (e.clientY - cy) * 0.02

}

const logoStyle = computed(() => ({ transform: `translate(${x.value}px, ${y.value}px)` }))



/* логин */

const { signIn } = useAuth()

async function login({ email, password }: { email: string; password: string }) {

  const ok = await signIn(email, password)

  if (ok) navigateTo('/profile')

}

</script>

