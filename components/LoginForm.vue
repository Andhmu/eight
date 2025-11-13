<!-- components/LoginForm.vue -->

<template>

  <div class="card">

    <h2>{{ title }}</h2>



    <!-- своя валидация, без нативных подсказок -->

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



      <div class="field" v-if="showPassword">

        <label>Пароль</label>

        <input

          v-model="password"

          type="password"

          class="input"

          autocomplete="current-password"

          :aria-invalid="Boolean(toastMessage)"

        />

      </div>



      <!-- инлайновый тост под полями -->

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

        <NuxtLink v-if="showForgot" class="link" to="/forgot">Забыли пароль?</NuxtLink>

        <button class="btn btn--primary" type="submit">{{ submitText }}</button>

      </div>

    </form>



    <div v-if="showSignup" class="below">

      Нет аккаунта?

      <NuxtLink class="link" to="/register">Зарегистрироваться</NuxtLink>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ref, watch } from 'vue'



const props = withDefaults(defineProps<{

  title: string

  submitText: string

  showForgot?: boolean

  showSignup?: boolean

  showPassword?: boolean



  /** внешний тост от родителя (ошибка сервера) */

  extMessage?: string | null

  extTitle?: string | null

  extTrigger?: number | null

}>(), {

  showForgot: true,

  showSignup: true,

  showPassword: true,

  extMessage: null,

  extTitle: null,

  extTrigger: null

})



const emit = defineEmits<{

  (e: 'submit', payload: { email: string; password: string }): void

}>()



const email = ref('')

const password = ref('')



/* локальный тост */

const toastMessage = ref('')

const toastTitle = ref('')

const toastProgress = ref(0)

let timer: number | null = null



function startProgress(ms = 3000) {

  toastProgress.value = 0

  if (timer) { clearInterval(timer); timer = null }

  const start = Date.now()

  timer = window.setInterval(() => {

    const p = Math.min(100, ((Date.now() - start) / ms) * 100)

    toastProgress.value = p

    if (p >= 100) { hideToast() }

  }, 40)

}

function showToast(message: string, title = 'Ошибка', ms = 3000) {

  toastTitle.value = title

  toastMessage.value = message

  startProgress(ms)

}

function hideToast() {

  toastMessage.value = ''

  toastTitle.value = ''

  toastProgress.value = 100

  if (timer) { clearInterval(timer); timer = null }

}



function isEmail(v: string) {

  return /.+@.+\..+/.test(v)

}



/** сабмит с валидацией: тост для неверного email/пустого пароля */

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



  emit('submit', { email: e, password: p })

}



/* ловим внешнюю серверную ошибку (неверная пара email/пароль) */

watch(() => props.extTrigger, () => {

  if (props.extMessage) {

    showToast(props.extMessage, props.extTitle || 'Не удалось войти', 5000)

  }

})

</script>