<!-- pages/profile.vue -->

<template>

  <div class="stack">

    <div class="card profile-info">

      <h1>Профиль</h1>

      <p><b>Email:</b> {{ user?.email }}</p>

      <p><b>ID:</b> {{ user?.id }}</p>

      <div class="cta">

        <button class="btn btn--light" @click="goHome">На главную</button>

        <button class="btn btn--primary" @click="logout">Выйти</button>

      </div>

    </div>

  </div>

</template>



<script setup lang="ts">

definePageMeta({ middleware: 'auth' })

const user = useSupabaseUser()

const client = useSupabaseClient()



function goHome() { navigateTo('/') }

async function logout() {

  await client.auth.signOut()

  navigateTo('/')

}

</script>



