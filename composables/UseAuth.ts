// composables/useAuth.ts
export function useAuth() {
  // "глобальное" реактивное состояние Nuxt (живёт между страницами)
  const isAuthed = useState<boolean>('isAuthed', () => false)
  const user = useState<{ login: string } | null>('user', () => null)

  function login(login: string, password: string) {
    // тут пока имитация проверки (любой логин/пароль длиной >=3)
    if (login.trim().length >= 3 && password.trim().length >= 3) {
      isAuthed.value = true
      user.value = { login }
      return true
    }
    return false
  }

  function logout() {
    isAuthed.value = false
    user.value = null
  }

  return { isAuthed, user, login, logout }
}