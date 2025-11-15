<!-- pages/index.vue -->
<template>
  <div class="auth-page" @mousemove="handleMove">
    <div class="auth-page__logo brand-big" :style="logoStyle">
      eight ∞
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import LoginForm from '~/components/auth/LoginForm.vue'
import { useAuth } from '~/composables/auth/useAuth'

definePageMeta({ middleware: ['guest-only'] })

const { signIn, loading, error } = useAuth()
const user = useSupabaseUser()

watchEffect(() => {
  if (user.value) navigateTo('/feed')
})

const x = ref(0)
const y = ref(0)

function handleMove(e: MouseEvent) {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const k = window.innerWidth < 768 ? 0.015 : 0.02
  x.value = (e.clientX - cx) * k
  y.value = (e.clientY - cy) * k
}

const logoStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
}))

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