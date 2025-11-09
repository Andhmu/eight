<!-- components/LoginForm.vue -->

<template>

  <div class="card">

    <h2>{{ title }}</h2>



    <form class="form" @submit.prevent="onSubmit">

      <div class="field">

        <label>Email</label>

        <input

          v-model="email"

          type="email"

          class="input"

          required

          inputmode="email"

          autocomplete="email"

          enterkeyhint="next"

          @keyup.enter="focusPassword"

        />

      </div>



      <div class="field">

        <label>Пароль</label>

        <input

          ref="passwordEl"

          v-model="password"

          type="password"

          class="input"

          required

          autocomplete="current-password"

          enterkeyhint="done"

          @keyup.enter="onSubmit"

        />

      </div>



      <!-- Скрытый сабмиттер на случай странного поведения браузера -->

      <button type="submit" style="display:none" aria-hidden="true" />



      <div class="actions">

        <NuxtLink class="link" to="/forgot" style="margin-right:auto">

          Забыли пароль?

        </NuxtLink>



        <button class="btn btn--primary" type="submit">

          {{ submitText }}

        </button>

      </div>

    </form>

  </div>

</template>



<script setup lang="ts">

import { ref } from 'vue'



const props = defineProps<{

  title: string

  submitText: string

}>()



const emit = defineEmits<{

  (e: 'submit', payload: { email: string; password: string }): void

}>()



const email = ref('')

const password = ref('')

const passwordEl = ref<HTMLInputElement | null>(null)



function focusPassword() {

  passwordEl.value?.focus()

}



function onSubmit() {

  emit('submit', { email: email.value, password: password.value })

}

</script>