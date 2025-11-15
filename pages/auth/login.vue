<!-- pages/auth/login.vue -->

<template></template>



<script setup lang="ts">

definePageMeta({ middleware: ['guest-only'] })

navigateTo('/')

</script>