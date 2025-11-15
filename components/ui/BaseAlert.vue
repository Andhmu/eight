<!-- components/ui/BaseAlert.vue -->

<template>

  <div class="toast" :class="alertClass">

    <div class="toast__content">

      <strong v-if="title">{{ title }}</strong>

      <slot>{{ message }}</slot>

    </div>

  </div>

</template>



<script setup lang="ts">

import { computed } from 'vue'



const props = withDefaults(defineProps<{

  type?: 'info' | 'success' | 'error'

  title?: string | null

  message?: string | null

}>(), {

  type: 'info',

  title: null,

  message: null,

})



const alertClass = computed(() => ({

  'toast--info': props.type === 'info',

  'toast--success': props.type === 'success',

  'toast--error': props.type === 'error',

}))

</script>