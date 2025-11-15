<!-- components/ui/BaseButton.vue -->

<template>

  <button

    :type="type"

    class="btn"

    :class="buttonClass"

    :disabled="disabled"

    @click="onClick"

  >

    <slot />

  </button>

</template>



<script setup lang="ts">

import { computed } from 'vue'



const props = withDefaults(defineProps<{

  type?: 'button' | 'submit' | 'reset'

  variant?: 'primary' | 'light' | 'ghost'

  disabled?: boolean

}>(), {

  type: 'button',

  variant: 'primary',

  disabled: false,

})



const emit = defineEmits<{

  (e: 'click', event: MouseEvent): void

}>()



const buttonClass = computed(() => ({

  'btn--primary': props.variant === 'primary',

  'btn--light': props.variant === 'light',

  'btn--ghost': props.variant === 'ghost',

}))



function onClick(event: MouseEvent) {

  if (props.disabled) return

  emit('click', event)

}

</script>



