<!-- pages/feed.vue -->

<template>

  <div class="stack">

    <div class="card">

      <h2>Основная лента авторизованного пользователя</h2>

      <p>Здесь будет ваша лента. (плейсхолдер)</p>

    </div>

  </div>

</template>



<script setup lang="ts">

definePageMeta({ middleware: ['auth-only'] })

</script>