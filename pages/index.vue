<!-- pages/index.vue -->
<template>
  <AuthLayout>
    <div class="card">
      <LoginForm
        title="Вход"
        submitText="Войти"
        :loading="loading"
        :showForgot="true"
        :showSignup="true"
        :showPassword="true"
        @submit="login"
        :extMessage="extMessage"
        :extTitle="extTitle"
        :extTrigger="extTrigger"
      />
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import AuthLayout from '~/components/auth/AuthLayout.vue'
import LoginForm from '~/components/auth/LoginForm.vue'
import { useAuth } from '~/composables/auth/useAuth'

definePageMeta({ middleware: ['guest-only'] })

const { signIn, loading, error } = useAuth()
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) navigateTo('/feed')
})

const extMessage = ref<string | null>(null)
const extTitle = ref<string | null>(null)
const extTrigger = ref(0)

async function login({ email, password }: { email: string; password: string }) {
  const ok = await signIn(email, password)
  if (ok) {
    navigateTo('/feed')
    return
  }

  extTitle.value = 'Не удалось войти'
  extMessage.value = error.value || 'Не удалось войти. Попробуйте ещё раз.'
  extTrigger.value++
}
</script>