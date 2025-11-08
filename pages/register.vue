<!-- pages/register.vue -->

<template>

  <div class="stack">

    <LoginForm

      title="Регистрация"

      submitText="Зарегистрироваться"

      :showForgot="false"

      :showSignup="false"

      @submit="register"

    />

    <div class="cta">

      Уже есть аккаунт?

      <NuxtLink class="link" to="/login">Войти</NuxtLink>

    </div>

  </div>

</template>



<script setup lang="ts">

import LoginForm from '~/components/LoginForm.vue'

import { useAuth } from '~/composables/UseAuth'



const { signUp } = useAuth()

async function register({ email, password }: { email: string; password: string }) {

  const ok = await signUp(email, password)

  if (ok) navigateTo('/profile')

}

</script>