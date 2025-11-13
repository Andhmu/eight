<!-- pages/profile.vue -->

<template>

  <div class="stack">

    <div class="card profile-info">

      <h2>Профиль</h2>



      <p><b>Email:</b> {{ user?.email }}</p>

      <p><b>ID:</b> {{ user?.id }}</p>

      <!-- Кнопки «На главную» и «Выйти» убраны по ТЗ -->

    </div>

  </div>

</template>



<script setup lang="ts">

const user = useSupabaseUser()

</script>