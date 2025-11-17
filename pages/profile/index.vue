<!-- pages/profile/index.vue -->
<template>
  <div class="stack">
    <div class="card profile-info">
      <h2>Профиль</h2>
      <p><b>Email:</b> {{ user?.email }}</p>
      <p><b>ID:</b> {{ user?.id }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth-only'] })

const user = useSupabaseUser()
</script>
