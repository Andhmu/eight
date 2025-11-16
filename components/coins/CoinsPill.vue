<!-- components/coins/CoinsPill.vue -->

<template>

  <!-- Показываем только для авторизованного пользователя -->

  <div v-if="user && coins !== null" class="coins-pill">

    {{ coins }}

  </div>

</template>



<script setup lang="ts">

import { useCoins } from '~/composables/coins/useCoins'



const user = useSupabaseUser()

const { coins } = useCoins()

</script>