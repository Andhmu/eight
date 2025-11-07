<template>
  <div class="app-shell">
    <header class="topbar">
      <NuxtLink to="/" class="brand">eight ∞</NuxtLink>

      <nav class="menu">
        <!-- показываем "Профиль" и "Выйти" только авторизованному -->
        <NuxtLink v-if="isAuthed" to="/profile" class="link">Профиль</NuxtLink>
        <button v-if="isAuthed" class="btn" @click="logout">Выйти</button>

        <!-- неавторизованному просто ссылка "Войти" на главную -->
        <NuxtLink v-else to="/" class="link">Войти</NuxtLink>
      </nav>
    </header>

    <main class="page">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * Берём состояние авторизации из нашего composable.
 * Файл: composables/useAuth.ts
 */
const { isAuthed, logout } = useAuth()
</script>

<style>
:root{
  --bg: #CFE3FF;            /* пастельный фон */
  --ink: #0E0F12;           /* основной текст */
  --ink-soft: rgba(14,15,18,.7);
  --white: #fff;
}

html, body { height: 100%; margin: 0; }
body{
  background: var(--bg);
  color: var(--ink);
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
}

.app-shell{ min-height: 100vh; display: flex; flex-direction: column; }

.topbar{
  position: sticky; top: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: rgba(255,255,255,.35);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(0,0,0,.06);
}

.brand{
  font-weight: 800;
  text-decoration: none;
  color: var(--ink);
}

.menu{ display: flex; align-items: center; gap: 10px; }

.link{
  color: var(--ink);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 10px;
}
.link:hover{ background: rgba(255,255,255,.6); }

.btn{
  border: 0; border-radius: 10px;
  padding: 6px 10px;
  background: #111; color: #fff;
  cursor: pointer;
}
.btn:hover{ opacity: .92; }

.page{
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
</style>
