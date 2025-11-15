<!-- components/auth/ResetPasswordForm.vue -->

<template>

  <form class="form" @submit.prevent="handleSubmit">

    <div class="field">

      <label>Пароль</label>

      <input

        v-model="password"

        type="password"

        class="input"

        autocomplete="new-password"

      />

    </div>

    <div class="field">

      <label>Повторите пароль</label>

      <input

        v-model="password2"

        type="password"

        class="input"

        autocomplete="new-password"

      />

    </div>

    <transition name="slide-fade">

      <div v-if="toastMessage" class="toast toast--inline" style="margin-top:8px">

        <div class="toast__content">

          <b v-if="toastTitle">{{ toastTitle }}</b>

          <template v-if="toastTitle"><br /></template>

          {{ toastMessage }}

        </div>

        <div class="toast__progress" :style="{ width: toastProgress + '%' }"></div>

      </div>

    </transition>

    <div class="actions" style="justify-content:space-between;margin-top:8px;">

      <button

        class="btn btn--light"

        type="button"

        :disabled="loading"

        @click="handleSkip"

      >

        Продолжить без смены пароля

      </button>

      <button

        class="btn btn--primary"

        type="submit"

        :disabled="loading"

      >

        Сохранить

      </button>

    </div>

  </form>

</template>



<script setup lang="ts">

import { useResetPasswordForm } from '~/composables/auth/useResetPasswordForm'



const props = defineProps<{

  loading: boolean

  serverError: string | null

}>()



const emit = defineEmits<{

  (e: 'submit', password: string): void

  (e: 'skip'): void

}>()



const {

  password,

  password2,

  toastMessage,

  toastTitle,

  toastProgress,

  handleSubmit: baseSubmit,

  handleSkip: baseSkip,

} = useResetPasswordForm({

  getServerError: () => props.serverError || null,

  onSubmit: pwd => emit('submit', pwd),

  onSkip: () => emit('skip'),

})



function handleSubmit() {

  baseSubmit()

}



function handleSkip() {

  baseSkip()

}

</script>