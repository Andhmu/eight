<!-- components/layout/AppHeader.vue -->
<template>
  <header class="site-header">
    <!-- Верхняя полоса: счётчик слева, логотип ∞ справа -->
    <div class="header-top">
      <CoinsPill />

      <NuxtLink :to="homePath" class="brand">
        ∞
      </NuxtLink>
    </div>

    <!-- Нижняя полоса: меню справа -->
    <div class="header-bottom">
      <nav class="nav">
        <NuxtLink to="/feed" class="nav-link">Лента</NuxtLink>

        <button
          type="button"
          class="nav-link nav-link-button"
          @click="$emit('open-profile-menu')"
        >
          Профиль
        </button>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CoinsPill from '~/components/coins/CoinsPill.vue'

defineEmits<{
  (e: 'open-profile-menu'): void
}>()

// Шапка показывается только для авторизованных, поэтому homePath всегда /feed
const homePath = computed(() => '/feed')
</script>
