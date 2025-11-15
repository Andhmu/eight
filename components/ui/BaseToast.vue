<template>

  <transition name="slide-fade">

    <div

      v-if="visible"

      class="toast toast--inline"

      :style="styleOverride"

    >

      <div class="toast__content">

        <b v-if="title">{{ title }}</b>

        <template v-if="title"><br /></template>

        {{ message }}

      </div>



      <div class="toast__progress" :style="{ width: progress + '%' }"></div>

    </div>

  </transition>

</template>



<script setup lang="ts">

const props = withDefaults(defineProps<{

  visible: boolean

  title?: string | null

  message?: string | null

  progress?: number

  styleOverride?: string | null

}>(), {

  title: null,

  message: null,

  progress: 0,

  styleOverride: null

})

</script>