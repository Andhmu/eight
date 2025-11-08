<!-- components/LoginForm.vue -->

<template>

  <div class="card">

    <h2>{{ title }}</h2>



    <form class="form" @submit.prevent="onSubmit">

      <div class="field">

        <label>Email</label>

        <input v-model="email" type="email" class="input" required />

      </div>



      <div class="field" v-if="showPassword">

        <label>Пароль</label>

        <input v-model="password" type="password" class="input" required />

      </div>



      <div class="actions">

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

import { ref } from 'vue'



const props = withDefaults(defineProps<{

  title: string

  submitText: string

  showForgot?: boolean

  showSignup?: boolean

  showPassword?: boolean

}>(), {

  showForgot: true,

  showSignup: true,

  showPassword: true,

})



const emit = defineEmits<{

  (e: 'submit', payload: { email: string; password: string }): void

}>()



const email = ref('')

const password = ref('')



function onSubmit() {

  emit('submit', { email: email.value, password: password.value })

}

</script>