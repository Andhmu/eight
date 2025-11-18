<!-- components/coins/CoinsPill.vue -->
<template>
  <button type="button" class="coins-pill">
    {{ formatted }}
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCoins } from '~/composables/coins/useCoins'

const coinsService = useCoins()

const coins = computed(() => {
  const v = (coinsService as any).coins?.value ?? 0
  return Math.max(0, Math.floor(v))
})

// можно форматировать с пробелами для больших чисел
const formatted = computed(() => coins.value.toLocaleString('ru-RU'))
</script>