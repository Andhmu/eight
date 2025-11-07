<template>
  <section class="auth-wrap">
    <div class="card">
      <h1 class="brand">eight ∞</h1>

      <form @submit.prevent="onSubmit" novalidate>
        <label>
          <span>Логин</span>
          <input v-model.trim="login" placeholder="ваш логин" autocomplete="username" required />
        </label>

        <label>
          <span>Пароль</span>
          <input v-model.trim="password" type="password" placeholder="••••••••" autocomplete="current-password" required />
        </label>

        <button class="btn primary" type="submit">Войти</button>

        <p v-if="error" class="error">{{ error }}</p>
      </form>

      <div class="links">
        <NuxtLink to="/register" class="link">Регистрация</NuxtLink>
        <NuxtLink to="/forgot" class="link">Забыл пароль</NuxtLink>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const { login: doLogin } = useAuth()
const route = useRoute()
const router = useRouter()

const login = ref('')
const password = ref('')
const error = ref('')

async function onSubmit() {
  error.value = ''
  if (doLogin(login.value, password.value)) {
    // после входа — перенаправляем на /profile или на то, куда пытались попасть
    const next = (route.query.next as string) || '/profile'
    router.push(next)
  } else {
    error.value = 'Неверные данные. Минимум 3 символа в логине и пароле.'
  }
}
</script>

<style scoped>
.auth-wrap { display:grid; min-height:calc(100vh - 56px); place-items:center; padding:24px; }
.card{
  width:min(440px, 92vw);
  background: rgba(255,255,255,.75);
  border:1px solid rgba(0,0,0,.08);
  border-radius:16px;
  padding:22px 20px;
  box-shadow:0 12px 36px rgba(0,0,0,.10);
  backdrop-filter: blur(8px);
}
.brand{ margin:0 0 12px; text-align:center; font-size:28px; }

form{ display:grid; gap:12px; margin-top:4px; }
label{ display:grid; gap:6px; font-size:14px; color:var(--ink-soft); }
input{
  padding:12px 14px; border-radius:10px;
  border:1px solid rgba(0,0,0,.12); outline:none;
  background:#fff;
}
input:focus{ border-color:#8aa4ff; box-shadow:0 0 0 3px rgba(138,164,255,.25); }

.btn{
  padding:12px 14px; border-radius:10px; cursor:pointer; border:0;
}
.primary{ background:#111; color:#fff; }
.primary:hover{ opacity:.92; }

.links{ display:flex; justify-content:space-between; margin-top:10px; }
.link{ color:var(--ink); opacity:.8; text-decoration:none; }
.link:hover{ text-decoration:underline; }
.error{ color:#c62828; margin:6px 0 0; font-size:14px; }
</style>
