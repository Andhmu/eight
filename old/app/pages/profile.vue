<template>
  <section class="card">
    <img class="avatar" src="https://i.pravatar.cc/160?img=3" alt="avatar">
    <h2>@eight_creator</h2>
    <p>Люблю петли ∞, строю социальную сеть.</p>
    <div class="row">
      <span>Постов: <b>0</b></span>
      <span>Подписчики: <b>0</b></span>
      <span>Петли: <b>0</b></span>
    </div>
    <NuxtLink to="/" class="btn">На главную</NuxtLink>
  </section>
</template>

<style scoped>
.card{
  width:min(560px, 92vw);
  background: rgba(255,255,255,.7);
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px; padding:24px;
  box-shadow: 0 12px 40px rgba(0,0,0,.10);
  text-align:center; backdrop-filter: blur(8px);
}
.avatar{ width:96px; height:96px; border-radius:50%; border:2px solid rgba(0,0,0,.08); }
h2{ margin:12px 0 8px; }
p{ margin:0 0 16px; color:var(--ink-soft); }
.row{ display:flex; gap:16px; justify-content:center; margin-bottom:16px; color:var(--ink-soft); }
.btn{
  display:inline-block; padding:10px 14px; border-radius:12px;
  background:#111; color:#fff; text-decoration:none;
}
.btn:hover{ opacity:.9; }
</style>
