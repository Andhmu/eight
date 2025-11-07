<template>
  <NuxtLink to="/" class="logo" aria-label="На главную"
            @mousemove="onMove" :style="style">
    eight ∞
  </NuxtLink>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const dx = ref(0), dy = ref(0)
function onMove(e: MouseEvent){
  const cx = window.innerWidth/2, cy = window.innerHeight/2
  dx.value = (e.clientX - cx) * 0.02
  dy.value = (e.clientY - cy) * 0.02
}
const style = computed(() => ({
  transform: `translate(${dx.value}px, ${dy.value}px)`,
  transition: 'transform .08s ease-out'
}))
</script>

<style scoped>
.logo{
  display:inline-block;
  font-size: clamp(48px, 10vw, 88px);
  font-weight: 800;
  letter-spacing:.02em;
  color: var(--ink);
  text-decoration:none;
  padding:18px 22px;
  border-radius:16px;
  background: rgba(255,255,255,.6);
  border:1px solid rgba(0,0,0,.06);
  box-shadow: 0 8px 28px rgba(0,0,0,.08);
  opacity:0; animation: pop 600ms ease forwards;
}
@keyframes pop{
  from{ opacity:0; transform: translateY(8px) scale(.98); }
  to  { opacity:1; transform: translateY(0) scale(1); }
}
</style>
