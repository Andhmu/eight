<!-- pages/register.vue -->

<template>

  <div class="stack">

    <LoginForm

      title="Регистрация"

      submitText="Зарегистрироваться"

      :showForgot="false"

      :showSignup="false"

      :showPassword="true"

      @submit="register"

    />

  </div>

</template>



<script setup lang="ts">

import LoginForm from '~/components/LoginForm.vue'

import { useAuth } from '~/composables/UseAuth'



definePageMeta({

  middleware: ['guest-only'], // ⬅ уже авторизованным сюда нельзя

})



const { signUp } = useAuth()

const user = useSupabaseUser()



watchEffect(() => {

  if (user.value) navigateTo('/feed')

})



async function register({ email, password }: { email: string; password: string }) {

  const ok = await signUp(email, password)

  if (ok) navigateTo('/feed') // можно менять на «подтвердить почту», если нужно

}

</script>



