<!-- pages/reset.vue -->
<template>
  <div class="stack">
    <div class="card">
      <template v-if="stage === 'checking'">
        <h2>Сброс пароля</h2>
        <p>Проверяем ссылку…</p>
      </template>

      <template v-else-if="stage === 'form'">
        <h2>Новый пароль</h2>
        <form class="form" @submit.prevent="save">
          <div class="field">
            <label>Пароль</label>
            <input v-model="password" type="password" clFass="input" required minlength="6" />
          </div>
          <div class="actions" style="justify-content:flex-end">
            <button class="btn btn--primary" type="submit" :disabled="loading">Сохранить</button>
          </div>
          <p v-if="filteredError" class="error">{{ filteredError }}</p>
        </form>
      </template>

      <template v-else-if="stage === 'done'">
        <h2>Готово</h2>
        <p>Пароль изменён. Можно <NuxtLink class="link" to="/login">войти</NuxtLink>.</p>
      </template>

      <template v-else>
        <h2>Сброс пароля</h2>
        <p>Некорректная или устаревшая ссылка для сброса пароля.</p>
        <NuxtLink class="link" to="/forgot">Отправить письмо ещё раз</NuxtLink>
        <p v-if="filteredError" class="error" style="margin-top:8px">{{ filteredError }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
const client = useSupabaseClient()

type Stage = 'checking' | 'form' | 'done' | 'invalid'
const stage = ref<Stage>('checking')
const loading = ref(false)
const error = ref<string | null>(null)
const password = ref('')

const USED_PREFIX = 'reset-used:'
const LOCK_KEY = 'reset-lock'
let tokenId: string | null = null

function parseHash(h: string) {
  const s = h.startsWith('#') ? h.slice(1) : h
  return Object.fromEntries(new URLSearchParams(s))
}
function replaceUrlClean() {
  history.replaceState({}, '', '/reset')
}
async function waitSession(msTotal = 3000, step = 250) {
  const tries = Math.ceil(msTotal / step)
  for (let i = 0; i < tries; i++) {
    const { data } = await client.auth.getSession()
    if (data.session) return true
    await new Promise(r => setTimeout(r, step))
  }
  return false
}
function extractTokenId(u: URL) {
  const q = u.searchParams
  const code = q.get('code')
  if (code) return code
  const h = parseHash(u.hash)
  if (h.access_token) return String(h.access_token)
  return null
}

const filteredError = computed(() => {
  if (!error.value) return null
  const msg = error.value.toLowerCase()
  if (msg.includes('code verifier') || msg.includes('auth code') || msg.includes('invalid request')) return null
  return error.value
})

onMounted(async () => {
  try {
    const url = new URL(location.href)

    // если уже ставили лок, и в адресе НЕТ кода/хэша — сразу запретим форму
    const hasLock = sessionStorage.getItem(LOCK_KEY) === '1'
    const hasUrlArtifacts = url.searchParams.has('code') || !!location.hash
    if (hasLock && !hasUrlArtifacts) {
      stage.value = 'invalid'
      return
    }

    // мягкий перезапуск после error из Supabase
    if (url.searchParams.get('error') && !url.searchParams.get('__retry')) {
      url.searchParams.delete('error')
      url.searchParams.set('__retry', '1')
      location.replace(url.toString())
      return
    }
    if (url.searchParams.get('__retry')) {
      url.searchParams.delete('__retry')
      history.replaceState({}, '', url.pathname)
    }

    tokenId = extractTokenId(url)

    // токен уже использовали — не даём форму
    if (tokenId && sessionStorage.getItem(USED_PREFIX + tokenId)) {
      stage.value = 'invalid'
      return
    }

    // === PKCE: ?code=... ===
    const code = url.searchParams.get('code')
    if (code) {
      const { error: e } = await client.auth.exchangeCodeForSession(code)
      if (!e || await waitSession()) {
        if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
        sessionStorage.setItem(LOCK_KEY, '1')          // <-- ставим лок сразу
        replaceUrlClean()
        stage.value = 'form'
        return
      }
      error.value = e?.message || null
    }

    // === Magic link: #access_token & refresh_token ===
    const h = parseHash(location.hash)
    if (h.access_token && h.refresh_token &&
        (h.type === 'recovery' || h.token_type === 'bearer')) {
      const { error: e } = await client.auth.setSession({
        access_token: h.access_token,
        refresh_token: h.refresh_token
      })
      if (!e || await waitSession()) {
        if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
        sessionStorage.setItem(LOCK_KEY, '1')          // <-- ставим лок сразу
        replaceUrlClean()
        stage.value = 'form'
        return
      }
      error.value = e?.message || null
    }

    // запасной план
    const ok = await waitSession()
    if (ok) {
      if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
      sessionStorage.setItem(LOCK_KEY, '1')            // <-- ставим лок даже здесь
      replaceUrlClean()
      stage.value = 'form'
    } else {
      stage.value = 'invalid'
    }
  } catch (e: any) {
    error.value = e?.message || 'Unexpected error'
    stage.value = 'invalid'
  }
})

async function save() {
  loading.value = true
  error.value = null
  const { error: e } = await client.auth.updateUser({ password: password.value })
  loading.value = false
  if (e) { error.value = e.message; return }
  // пароль сменён — чистим локи
  sessionStorage.removeItem(LOCK_KEY)
  if (tokenId) sessionStorage.removeItem(USED_PREFIX + tokenId)
  stage.value = 'done'
}
</script>

