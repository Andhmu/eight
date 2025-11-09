<!-- pages/login.vue -->

<template>

  <div class="stack">

    <LoginForm

      title="Вход"

      submitText="Войти"

      @submit="login"

    />

  </div>

</template>



<script setup lang="ts">

import LoginForm from '~/components/LoginForm.vue'

import { useAuth } from '~/composables/UseAuth'



const { signIn } = useAuth()



async function login({ email, password }: { email: string; password: string }) {

  const ok = await signIn(email, password)

  if (ok) navigateTo('/profile')

}

</script>