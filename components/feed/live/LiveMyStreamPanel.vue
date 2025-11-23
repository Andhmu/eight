<template>

  <div class="live-card__holo">

    <div class="live-card__holo-frame">

      <div class="live-card__screen">

        <video

          :ref="setVideoEl"

          class="live-card__player"

          autoplay

          muted

          playsinline

        ></video>



        <!-- Прозрачная панель с кнопками поверх видео (Black Mirror style) -->

        <div class="live-card__overlay-panel">

          <button

            type="button"

            class="live-card__icon-btn"

            :disabled="busy"

            @click="$emit('switchCamera')"

          >

            ⇄

            <span class="visually-hidden">Сменить камеру</span>

          </button>



          <button

            type="button"

            class="live-card__icon-btn live-card__icon-btn--danger"

            :disabled="busy"

            @click="$emit('stopLive')"

          >

            ⏹

            <span class="visually-hidden">Завершить трансляцию</span>

          </button>

        </div>

      </div>

    </div>

  </div>

</template>



<script setup lang="ts">

const props = defineProps<{

  busy: boolean

  setVideoEl: (el: HTMLVideoElement | null) => void

}>()



const emit = defineEmits<{

  switchCamera: []

  stopLive: []

}>()

</script>