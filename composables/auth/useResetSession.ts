// composables/auth/useResetSession.ts
import { computed, onMounted, ref } from 'vue'

type Stage = 'checking' | 'form' | 'done' | 'invalid'

export function useResetSession() {
  const client = useSupabaseClient()

  const stage = ref<Stage>('checking')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // для одноразового использования ссылки
  const USED_PREFIX = 'reset-used:'
  const LOCK_KEY = 'reset-lock'
  let tokenId: string | null = null

  // парсим hash "#access_token=..." в объект
  function parseHash(h: string) {
    const s = h.startsWith('#') ? h.slice(1) : h
    return Object.fromEntries(new URLSearchParams(s))
  }

  // убираем query/hash из адреса, оставляя /auth/reset
  function replaceUrlClean() {
    history.replaceState({}, '', '/auth/reset')
  }

  // ждём пока Supabase создаст сессию
  async function waitSession(msTotal = 3000, step = 250) {
    const tries = Math.ceil(msTotal / step)
    for (let i = 0; i < tries; i++) {
      const { data } = await client.auth.getSession()
      if (data.session) return true
      await new Promise(resolve => setTimeout(resolve, step))
    }
    return false
  }

  // пробуем вытащить id токена (для пометки USED_PREFIX)
  function extractTokenId(u: URL) {
    const q = u.searchParams
    const code = q.get('code')
    if (code) return code
    const h = parseHash(u.hash)
    if (h.access_token) return String(h.access_token)
    return null
  }

  // человекочитаемая ошибка только для стадии invalid
  const filteredError = computed(() => {
    if (!error.value) return null
    const msg = error.value.toLowerCase()
    // служебные/технические ошибки Supabase — прячем
    if (
      msg.includes('code verifier') ||
      msg.includes('auth code') ||
      msg.includes('jwt') ||
      msg.includes('invalid request')
    ) {
      return null
    }
    return error.value
  })

  // основная логика разбора ссылки из письма
  onMounted(async () => {
    try {
      const url = new URL(location.href)

      // если лок уже стоял, а в адресе нет ни code, ни hash — сразу invalid
      const hasLock = sessionStorage.getItem(LOCK_KEY) === '1'
      const hasUrlArtifacts = url.searchParams.has('code') || !!location.hash
      if (hasLock && !hasUrlArtifacts) {
        stage.value = 'invalid'
        return
      }

      // мягкий рестарт при ?error=... от Supabase
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

      // токен уже использовали — форму не даём
      if (tokenId && sessionStorage.getItem(USED_PREFIX + tokenId)) {
        stage.value = 'invalid'
        return
      }

      // === вариант PKCE: ?code=... ===
      const code = url.searchParams.get('code')
      if (code) {
        const { error: e } = await client.auth.exchangeCodeForSession(code)
        if (!e && (await waitSession())) {
          if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
          sessionStorage.setItem(LOCK_KEY, '1')
          replaceUrlClean()
          error.value = null
          stage.value = 'form'
          return
        }
        error.value = e?.message || null
      }

      // === вариант magic-link: #access_token & refresh_token ===
      const h = parseHash(location.hash)
      if (
        h.access_token &&
        h.refresh_token &&
        (h.type === 'recovery' || h.token_type === 'bearer')
      ) {
        const { error: e } = await client.auth.setSession({
          access_token: h.access_token,
          refresh_token: h.refresh_token,
        })
        if (!e && (await waitSession())) {
          if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
          sessionStorage.setItem(LOCK_KEY, '1')
          replaceUrlClean()
          error.value = null
          stage.value = 'form'
          return
        }
        error.value = e?.message || null
      }

      // запасной план — вдруг сессия уже есть
      const ok = await waitSession()
      if (ok) {
        if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')
        sessionStorage.setItem(LOCK_KEY, '1')
        replaceUrlClean()
        error.value = null
        stage.value = 'form'
      } else {
        stage.value = 'invalid'
      }
    } catch (e: any) {
      error.value = e?.message || 'Unexpected error'
      stage.value = 'invalid'
    }
  })

  // сохранить новый пароль (Supabase updateUser)
  async function savePassword(newPassword: string) {
    loading.value = true
    error.value = null
    const { error: e } = await client.auth.updateUser({ password: newPassword })
    loading.value = false
    if (e) {
      error.value = e.message
      return false
    }
    // пароль сменён — очищаем локи
    sessionStorage.removeItem(LOCK_KEY)
    if (tokenId) sessionStorage.removeItem(USED_PREFIX + tokenId)
    stage.value = 'done'
    return true
  }

  // просто продолжить без смены пароля
  function continueWithoutChange() {
    navigateTo('/feed')
  }

  return { stage, loading, error, filteredError, savePassword, continueWithoutChange }
}
