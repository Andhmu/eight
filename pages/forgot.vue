<!-- pages/forgot.vue -->



<template>

  <div class="auth-page">

    <div class="auth-page__card card">



      <h2>Восстановление пароля</h2>



      <form class="form" novalidate @submit.prevent="sendReset">



        <div class="field">

          <label>Email</label>

          <input v-model="email" type="email" class="input" />

        </div>



        <!-- Тост под полем -->

        <transition name="slide-fade">

          <div v-if="notice" class="toast toast--inline">

            <div class="toast__content">

              <b>{{ toastTitle }}</b><br />

              {{ toastMessage }}

            </div>

            <div class="toast__progress" :style="{ width: progress + '%' }"></div>

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

import { ref, onBeforeUnmount } from 'vue'

import { useAuth } from '~/composables/UseAuth'



const { reset, loading } = useAuth()



const email = ref('')



/* тоcт */

const notice = ref(false)

const toastTitle = ref('Проверьте почту')

const toastMessage = ref('Если такой аккаунт существует — мы отправили ссылку для смены пароля.')

const progress = ref(0)

let timer: number | null = null



function showToast(ms = 5000) {

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

      clearInterval(timer!)

      timer = null

    }

  }, 40)

}



function isEmail(v: string) {

  return /.+@.+\..+/.test(v)

}



async function sendReset() {

  if (!email.value) {

    toastTitle.value = 'Ошибка'

    toastMessage.value = 'Введите email'

    showToast()

    return

  }



  if (!isEmail(email.value)) {

    toastTitle.value = 'Ошибка'

    toastMessage.value = 'Введите корректный email'

    showToast()

    return

  }



  await reset(email.value)



  toastTitle.value = 'Проверьте почту'

  toastMessage.value = 'Если такой аккаунт существует — мы отправили ссылку для смены пароля.'

  showToast()

}



onBeforeUnmount(() => {

  if (timer) clearInterval(timer)

})

</script>

