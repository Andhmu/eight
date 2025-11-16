<!-- pages/auth/reset.vue -->
<template>
  <AuthLayout>
    <div class="stack">
      <div class="card">
        <template v-if="stage === 'checking'">
          <h2>Сброс пароля</h2>
          <p>Проверяем ссылку…</p>
        </template>

        <template v-else-if="stage === 'form'">
          <h2>Новый пароль</h2>

          <ResetPasswordForm
            :loading="loading"
            :server-error="error"
            @submit="onSubmitPassword"
            @skip="continueWithoutChange"
          />
        </template>

        <template v-else-if="stage === 'done'">
          <h2>Готово</h2>

          <p>
            Пароль изменён. Можно
            <NuxtLink class="link" to="/auth/login">войти</NuxtLink>.
          </p>
        </template>

        <template v-else>
          <h2>Сброс пароля</h2>
          <p>Некорректная или устаревшая ссылка для сброса пароля.</p>

          <NuxtLink class="link" to="/auth/forgot">
            Отправить письмо ещё раз
          </NuxtLink>

          <p
            v-if="filteredError"
            class="error"
            style="margin-top:8px"
          >
            {{ filteredError }}
          </p>
        </template>
      </div>
    </div>
  </AuthLayout>
</template>

<script setup lang="ts">
import AuthLayout from '~/components/auth/AuthLayout.vue'
import ResetPasswordForm from '~/components/auth/ResetPasswordForm.vue'
import { useResetSession } from '~/composables/auth/useResetSession'

const {
  stage,
  loading,
  error,
  filteredError,
  savePassword,
  continueWithoutChange,
} = useResetSession()

async function onSubmitPassword(password: string) {
  await savePassword(password)
}
</script>
