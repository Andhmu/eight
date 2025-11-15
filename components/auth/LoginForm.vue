<!-- components/auth/LoginForm.vue -->

<template>
  <div>
    <h2>{{ title }}</h2>

    <form class="form" novalidate @submit.prevent="onSubmit">
      <div class="field">
        <label>Email</label>
        <input
          v-model="email"
          type="email"
          class="input"
          autocomplete="email"
          inputmode="email"
          :aria-invalid="Boolean(toastMessage)"
        />
      </div>

      <div v-if="showPassword" class="field">
        <label>Пароль</label>
        <input
          v-model="password"
          type="password"
          class="input"
          autocomplete="current-password"
          :aria-invalid="Boolean(toastMessage)"
        />
      </div>

      <transition name="slide-fade">
        <div v-if="toastMessage" class="toast toast--inline" style="margin-top:8px">
          <div class="toast__content">
            <b v-if="toastTitle">{{ toastTitle }}</b><template v-if="toastTitle"><br /></template>
            {{ toastMessage }}
          </div>
          <div class="toast__progress" :style="{ width: toastProgress + '%' }"></div>
        </div>
      </transition>

      <div class="actions" style="justify-content:flex-end">
        <NuxtLink v-if="showForgot" class="link" to="/auth/forgot">Забыли пароль?</NuxtLink>
        <button class="btn btn--primary" type="submit" :disabled="loading">{{ submitText }}</button>
      </div>
    </form>

    <div v-if="showSignup" class="below">
      Нет аккаунта?
      <NuxtLink class="link" to="/auth/register">Зарегистрироваться</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useInlineToast } from '~/composables/ui/useInlineToast'

const props = withDefaults(defineProps<{
  title: string
  submitText: string
  loading?: boolean
  showForgot?: boolean
  showSignup?: boolean
  showPassword?: boolean
  extMessage?: string | null
  extTitle?: string | null
  extTrigger?: number | null
}>(), {
  loading: false,
  showForgot: true,
  showSignup: true,
  showPassword: true,
  extMessage: null,
  extTitle: null,
  extTrigger: null,
})

const emit = defineEmits<{
  (e: 'submit', payload: { email: string; password: string }): void
}>()

const email = ref('')
const password = ref('')

const { toastMessage, toastTitle, toastProgress, showToast, hideToast } =
  useInlineToast('Ошибка', 3000)

function isEmail(v: string) {
  return /.+@.+\..+/.test(v)
}

function onSubmit() {
  const e = email.value.trim()
  const p = password.value

  if (!e || !isEmail(e)) {
    showToast('Введите корректный email')
    return
  }
  if (props.showPassword && !p) {
    showToast('Введите пароль')
    return
  }

  hideToast()
  emit('submit', { email: e, password: p })
}

watch(() => props.extTrigger, () => {
  if (props.extMessage) {
    showToast(props.extMessage, props.extTitle || 'Не удалось войти', 5000)
  }
})
</script>
