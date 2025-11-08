<!-- layouts/default.vue -->

<template>

  <header class="header">

    <NuxtLink class="brand" to="/">eight ∞</NuxtLink>



    <nav class="nav">

      <NuxtLink class="link" to="/login">Вход</NuxtLink>

      <NuxtLink class="link" to="/register">Регистрация</NuxtLink>

    </nav>

  </header>



  <main class="page">

    <slot />

  </main>

</template>