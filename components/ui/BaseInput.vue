<!-- components/ui/BaseInput.vue -->

<template>

  <label class="field">

    <span v-if="label" class="field__label">{{ label }}</span>

    <input

      class="input"

      :value="modelValue ?? ''"

      v-bind="$attrs"

      @input="onInput"

    />

    <small v-if="hint" class="field__hint">{{ hint }}</small>

  </label>

</template>



<script setup lang="ts">

const props = defineProps<{

  modelValue: string | number | null

  label?: string

  hint?: string

}>()



const emit = defineEmits<{

  (e: 'update:modelValue', value: string | number | null): void

}>()



function onInput(e: Event) {

  const target = e.target as HTMLInputElement

  emit('update:modelValue', target.value)

}

</script>