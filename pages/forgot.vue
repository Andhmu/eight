<template>
  <section class="auth-wrap">
    <div class="card">
      <h2>Восстановление пароля</h2>
      <form @submit.prevent="onSubmit" novalidate>
        <label><span>Логин или e-mail</span><input v-model.trim="who" required /></label>
        <button class="btn primary" type="submit">Отправить ссылку</button>
        <p v-if="msg" class="ok">{{ msg }}</p>
      </form>
      <div class="links">
        <NuxtLink to="/" class="link">Назад ко входу</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const who = ref(''), msg = ref('')
function onSubmit(){ msg.value = 'Если такой аккаунт существует — отправили инструкцию на e-mail.' }
</script>

<style scoped>
/* те же стили что и выше */
.auth-wrap{ display:grid; min-height:calc(100vh - 56px); place-items:center; padding:24px; }
.card{ width:min(440px, 92vw); background: rgba(255,255,255,.75); border:1px solid rgba(0,0,0,.08); border-radius:16px; padding:22px 20px; box-shadow:0 12px 36px rgba(0,0,0,.10); backdrop-filter: blur(8px); }
form{ display:grid; gap:12px; margin-top:8px; }
label{ display:grid; gap:6px; font-size:14px; color:var(--ink-soft); }
input{ padding:12px 14px; border-radius:10px; border:1px solid rgba(0,0,0,.12); background:#fff; }
.btn{ padding:12px 14px; border-radius:10px; border:0; cursor:pointer; }
.primary{ background:#111; color:#fff; }
.links{ display:flex; justify-content:flex-end; margin-top:10px; }
.link{ color:var(--ink); opacity:.8; text-decoration:none; }
.ok{ color:#1b5e20; font-size:14px; margin-top:6px; }
</style>
