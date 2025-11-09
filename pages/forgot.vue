<template>

  <div class="stack page-forgot">

    <div class="card">

      <!-- 🔔 Тост над формой -->

      <transition name="slide-fade">

        <div v-if="notice" class="toast">

          <div class="toast__content">

            <b>Проверьте почту</b><br />

            Мы отправили ссылку для смены пароля.

          </div>

          <div class="toast__progress">

            <i :style="{ width: progress + '%' }"></i>

          </div>

        </div>

      </transition>



      <h2>Восстановление пароля</h2>



      <form class="form" @submit.prevent="sendResetLink">

        <div class="field">

          <label>Email</label>

          <input v-model="email" type="email" class="input" required />

        </div>



        <div class="actions" style="justify-content:flex-end">

          <button class="btn btn--primary" type="submit" :disabled="loading">

            Отправить ссылку

          </button>

        </div>



        <p v-if="error" class="error">{{ error }}</p>

      </form>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ref } from 'vue'



const client = useSupabaseClient()



const email = ref('')

const loading = ref(false)

const error = ref<string | null>(null)



const notice = ref(false)

const progress = ref(0)

let timer: number | null = null



function startToastAndRedirect() {

  notice.value = true

  progress.value = 0



  const duration = 5000

  const steps = 50

  const interval = duration / steps

  let tick = 0



  if (timer) {

    clearInterval(timer)

    timer = null

  }

  timer = window.setInterval(() => {

    tick++

    progress.value = Math.min(100, (tick / steps) * 100)

    if (tick >= steps) {

      clearInterval(timer!)

      timer = null

      navigateTo('/')

    }

  }, interval)

}



async function sendResetLink() {

  loading.value = true

  error.value = null



  const { public: { SITE_URL } } = useRuntimeConfig()

  const base = (process.client ? window.location.origin : SITE_URL) || SITE_URL

  const redirectTo = `${(base as string).replace(/\/$/, '')}/reset`



  const { error: e } = await client.auth.resetPasswordForEmail(email.value, { redirectTo })



  loading.value = false



  if (e) {

    error.value = e.message

    return

  }



  startToastAndRedirect()

}

</script>