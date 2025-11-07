<template>
  <div class="app-shell">
    <!-- простая «шапка» -->
    <header class="topbar">
      <NuxtLink to="/" class="brand">eight ∞</NuxtLink>

      <nav class="menu">
        <NuxtLink to="/profile" class="link">Профиль</NuxtLink>
      </nav>
    </header>

    <!-- сюда подставится страница -->
    <main class="page">
      <slot />
    </main>
  </div>
</template>

<style>
/* фон на весь сайт */
:root{
  --bg: #CFE3FF;   /* пастельный Blueberry Milk */
  --ink:#0E0F12;
  --ink-soft: rgba(14,15,18,.7);
  --white:#fff;
}
html,body{ height:100%; margin:0; }
body{ background:var(--bg); color:var(--ink); font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial; }

.app-shell{ min-height:100%; display:flex; flex-direction:column; }
.topbar{
  position:sticky; top:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 16px; backdrop-filter: blur(8px);
  background: rgba(255,255,255,.25); border-bottom:1px solid rgba(0,0,0,.06);
}
.brand{ font-weight:700; text-decoration:none; color:var(--ink); }
.menu{ display:flex; gap:12px; }
.link{ color:var(--ink); text-decoration:none; padding:6px 10px; border-radius:10px; }
.link:hover{ background:rgba(255,255,255,.6); }

.page{ flex:1; display:grid; place-items:center; padding:24px; }
</style>