<template>

  <header class="live-card__header">

    <div class="live-card__header-left">

      <h2 class="live-card__title">Прямой эфир</h2>

    </div>



    <div class="live-card__header-actions">

      <!-- Не в эфире — holo-кнопка запуска -->

      <button

        v-if="!isLive"

        type="button"

        class="live-card__action live-card__action--start"

        :disabled="busy"

        @click="$emit('start')"

      >

        <span class="live-card__action-glow"></span>

        <span class="live-card__action-label">Транслировать меня</span>

      </button>

      <!-- В эфире в шапке больше ничего не показываем:

           управление перенесено внутрь видео -->

    </div>

  </header>

</template>



<script setup lang="ts">

const props = defineProps<{

  isLive: boolean

  busy: boolean

}>()



const emit = defineEmits<{

  start: []

}>()

</script>