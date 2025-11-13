// middleware/guest-only.ts

export default defineNuxtRouteMiddleware(() => {

  const user = useSupabaseUser()

  if (user.value) {

    return navigateTo('/feed')

  }

})