<!-- pages/auth/forgot.vue -->

<template>
  <div class="auth-page">
    <div class="auth-page__card card">
      <h2>Восстановление пароля</h2>

      <form class="form" novalidate @submit.prevent="sendReset">
        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" class="input" />
        </div>

        <transition name="slide-fade">
          <div v-if="toastMessage" class="toast toast--inline">
            <div class="toast__content">
              <b>{{ toastTitle }}</b><br />
              {{ toastMessage }}
            </div>
            <div class="toast__progress" :style="{ width: toastProgress + '%' }"></div>
          </div>
        </transition>

        <div class="actions" style="justify-content:flex-end">
          <button class="btn btn--primary" type="submit" :disabled="loading">
            Отправить ссылку
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useInlineToast } from '~/composables/ui/useInlineToast'

const { reset, loading } = useAuth()
const email = ref('')

const { toastMessage, toastTitle, toastProgress, showToast } =
  useInlineToast('Ошибка', 5000)

function isEmail(v: string) {
  return /.+@.+\..+/.test(v)
}

async function sendReset() {
  if (!email.value) {
    showToast('Введите email')
    return
  }

  if (!isEmail(email.value)) {
    showToast('Введите корректный email')
    return
  }

  await reset(email.value)
  showToast(
    'Если такой аккаунт существует — мы отправили ссылку для смены пароля.',
    'Проверьте почту',
    5000,
  )
}
</script>
