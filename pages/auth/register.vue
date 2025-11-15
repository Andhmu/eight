<!-- pages/auth/register.vue -->
<template>
  <div class="card">
    <LoginForm
      title="Регистрация"
      submitText="Зарегистрироваться"
      :loading="loading"
      :showForgot="false"
      :showSignup="false"
      :showPassword="true"
      @submit="register"
      :extMessage="extMessage"
      :extTitle="extTitle"
      :extTrigger="extTrigger"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import LoginForm from '~/components/auth/LoginForm.vue'
import { useAuth } from '~/composables/auth/useAuth'

definePageMeta({ middleware: ['guest-only'] })

const { signUp, loading, error } = useAuth()
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) navigateTo('/feed')
})

const extMessage = ref<string | null>(null)
const extTitle = ref<string | null>(null)
const extTrigger = ref(0)

async function register({ email, password }: { email: string; password: string }) {
  const ok = await signUp(email, password)

  if (!ok) {
    extTitle.value = 'Ошибка'
    extMessage.value = error.value || 'Не удалось создать аккаунт'
    extTrigger.value++
    return
  }

  extTitle.value = 'Успешно'
  extMessage.value = 'Вы успешно зарегистрировались!'
  extTrigger.value++

  setTimeout(() => {
    navigateTo('/feed')
  }, 2000)
}
</script>
