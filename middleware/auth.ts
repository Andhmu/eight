// middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const { isAuthed } = useAuth()
  if (!isAuthed.value) {
    // если не авторизован — отправляем на главную (форму входа)
    return navigateTo({ path: '/', query: { next: to.fullPath } })
  }
})
