<template>
  <div class="auth-page" @mousemove="handleMove">
    <div
      class="auth-page__logo brand-big"
      :style="logoStyle"
      @click="goHome"
    >
      eight ∞
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const x = ref(0)
const y = ref(0)

function handleMove(e: MouseEvent) {
  if (!process.client) return

  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2
  const k = window.innerWidth < 768 ? 0.015 : 0.02

  x.value = (e.clientX - cx) * k
  y.value = (e.clientY - cy) * k
}

const logoStyle = computed(() => ({
  transform: `translate(${x.value}px, ${y.value}px)`,
}))

const router = useRouter()

function goHome() {
  router.push('/')
}
</script>
