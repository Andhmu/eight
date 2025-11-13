<!-- pages/index.vue -->



<template>

  <div class="auth-page" @mousemove="handleMove">

    <!-- логотип -->

    <div class="auth-page__logo brand-big" :style="logoStyle">

      eight ∞

    </div>



    <div class="auth-page__card card">

      <h2>Вход</h2>



      <form class="form" novalidate @submit.prevent="login">

        <div class="field">

          <label>Email</label>

          <input v-model="email" type="email" class="input" />

        </div>



        <div class="field">

          <label>Пароль</label>

          <input v-model="password" type="password" class="input" />

        </div>



        <!-- такой же тост под полем пароля -->

        <transition name="slide-fade">

          <div v-if="notice" class="toast toast--inline">

            <div class="toast__content">

              <b>Не удалось войти</b><br />

              {{ message }}

            </div>

            <div class="toast__progress" :style="{ width: progress + '%' }"></div>

          </div>

        </transition>



        <div class="actions" style="justify-content:flex-end">

          <NuxtLink class="link" to="/forgot">Забыли пароль?</NuxtLink>

          <button class="btn btn--primary" type="submit" :disabled="loading">

            Войти

          </button>

        </div>

      </form>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ref, computed, onBeforeUnmount, watchEffect } from 'vue'

import { useAuth } from '~/composables/UseAuth'



definePageMeta({ middleware: ['guest-only'] })



const { signIn, loading } = useAuth()

const user = useSupabaseUser()



watchEffect(() => {

  if (user.value) navigateTo('/feed')

})



/* параллакс логотипа */

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



/* логин + тост, как на login.vue */

const email = ref('')

const password = ref('')



const notice = ref(false)

const message = ref('Неверный email или пароль.')

const progress = ref(0)

let timer: number | null = null



function showToast(text: string, ms = 5000) {

  message.value = text

  notice.value = true

  progress.value = 0



  if (timer) {

    clearInterval(timer)

    timer = null

  }



  const started = Date.now()



  timer = window.setInterval(() => {

    const p = Math.min(100, ((Date.now() - started) / ms) * 100)

    progress.value = p

    if (p >= 100) {

      notice.value = false

      if (timer) {

        clearInterval(timer)

        timer = null

      }

    }

  }, 40)

}



function isEmail(v: string) {

  return /.+@.+\..+/.test(v)

}



async function login() {

  if (!email.value) {

    showToast('Введите email')

    return

  }



  if (!isEmail(email.value)) {

    showToast('Введите корректный email')

    return

  }



  if (!password.value) {

    showToast('Введите пароль')

    return

  }



  const ok = await signIn(email.value, password.value)

  if (ok) {

    return navigateTo('/feed')

  }



  showToast('Неверный email или пароль')

}



onBeforeUnmount(() => {

  if (timer) {

    clearInterval(timer)

    timer = null

  }

})

</script>

