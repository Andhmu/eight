// middleware/auth-only.ts

export default defineNuxtRouteMiddleware(() => {

  const user = useSupabaseUser()

  if (!user.value) return navigateTo('/login')

})