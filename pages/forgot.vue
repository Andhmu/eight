<template>

  <div class="stack">

    <div class="card">



      <!-- 🔔 Тост над формой -->

      <transition name="slide-fade">

        <div v-if="notice" class="toast">

          <div class="toast__content">

            <b>Проверьте почту</b><br />

            Мы отправили ссылку для смены пароля.

          </div>

          <div class="toast__progress" :style="{ width: progress + '%' }"></div>

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



async function sendResetLink() {

  loading.value = true

  error.value = null



  const { error: e } = await client.auth.resetPasswordForEmail(email.value, {

    redirectTo: 'http://localhost:3000/reset'

  })



  loading.value = false

  if (e) {

    error.value = e.message

    return

  }



  // ✅ Показываем тост на 5 секунд

  notice.value = true

  progress.value = 0



  const duration = 5000 // 5 секунд

  const steps = 50

  const interval = duration / steps



  let count = 0

  const timer = setInterval(() => {

    count++

    progress.value = (count / steps) * 100

    if (count >= steps) {

      clearInterval(timer)

      navigateTo('/')

    }

  }, interval)

}

</script>