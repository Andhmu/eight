// composables/auth/UseAuth.ts
import { ref } from 'vue'

export function useAuth() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const loading = ref(false)
  const error = ref<string | null>(null)

  function getBaseUrl() {
    const { public: { SITE_URL } } = useRuntimeConfig()
    const origin = process.client ? window.location.origin : SITE_URL
    return (origin || SITE_URL).replace(/\/$/, '')
  }

  function mapSignInError(e: any): string {
    const msg = (e?.message || '').toLowerCase()

    // 1) почта не подтверждена
    if (
      msg.includes('email not confirmed') ||
      msg.includes('email not verified')
    ) {
      return 'Вы зарегистрировались, но ещё не подтвердили почту. Перейдите по ссылке из письма и повторите вход.'
    }

    // 2) неверный логин/пароль (сюда попадает и "неизвестная почта")
    if (msg.includes('invalid login credentials')) {
      return 'Неверный email или пароль. Проверьте данные и попробуйте ещё раз.'
    }

    return 'Не удалось войти. Попробуйте ещё раз.'
  }

  function mapSignUpError(e: any): string {
    const msg = (e?.message || '').toLowerCase()

    // на всякий случай, если Supabase всё-таки вернёт явную ошибку
    if (
      msg.includes('user already registered') ||
      msg.includes('duplicate key') ||
      msg.includes('already exists')
    ) {
      return 'Пользователь с таким email уже зарегистрирован.'
    }

    return 'Не удалось создать аккаунт. Попробуйте ещё раз.'
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    error.value = null

    const { error: e } = await client.auth.signInWithPassword({ email, password })

    loading.value = false

    if (e) {
      error.value = mapSignInError(e)
      return false
    }

    return true
  }

  async function signUp(email: string, password: string) {
    loading.value = true
    error.value = null

    const base = getBaseUrl()

    const { data, error: e } = await client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${base}/` },
    })

    loading.value = false

    // явная ошибка от Supabase
    if (e) {
      error.value = mapSignUpError(e)
      return false
    }

    // ВАЖНО: проверка на уже существующего пользователя
    // Официальный трюк Supabase: если identities пустой массив,
    // значит, пользователь с таким email уже есть.
    const identities = (data as any)?.user?.identities as any[] | undefined
    if (identities && identities.length === 0) {
      error.value = 'Пользователь с таким email уже зарегистрирован.'
      return false
    }

    return true
  }

  async function reset(email: string) {
    loading.value = true
    error.value = null

    const base = getBaseUrl()
    const redirectTo = `${base}/auth/reset`

    const { error: e } = await client.auth.resetPasswordForEmail(email, { redirectTo })

    loading.value = false

    if (e) {
      error.value = e.message || 'Не удалось отправить письмо для сброса пароля.'
      return false
    }

    return true
  }

  async function updatePassword(newPassword: string) {
    loading.value = true
    error.value = null

    const { error: e } = await client.auth.updateUser({ password: newPassword })

    loading.value = false

    if (e) {
      error.value = e.message
      return false
    }

    return true
  }

  async function signOut() {
    loading.value = true
    error.value = null

    const { error: e } = await client.auth.signOut()

    loading.value = false

    if (e) {
      error.value = e.message
      return false
    }

    return true
  }

  return { user, loading, error, signIn, signUp, reset, updatePassword, signOut }
}
