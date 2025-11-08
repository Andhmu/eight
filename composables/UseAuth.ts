// composables/UseAuth.ts

import { ref } from 'vue'



export function useAuth() {

  const client = useSupabaseClient()

  const user = useSupabaseUser()

  const loading = ref(false)

  const error = ref<string|null>(null)



  async function signIn(email: string, password: string) {

    loading.value = true; error.value = null

    const { error: e } = await client.auth.signInWithPassword({ email, password })

    loading.value = false

    if (e) { error.value = e.message; return false }

    return true

  }



  async function signUp(email: string, password: string) {

    loading.value = true; error.value = null

    const { public: { SITE_URL } } = useRuntimeConfig()

    const origin = process.client ? window.location.origin : SITE_URL

    const base = (origin || SITE_URL).replace(/\/$/, '')

    const { error: e } = await client.auth.signUp({

      email, password,

      options: { emailRedirectTo: `${base}/login` }

    })

    loading.value = false

    if (e) { error.value = e.message; return false }

    return true

  }



  // Вариант А: magic-link с hash

 async function reset(email: string) {

  loading.value = true; error.value = null

  const { public: { SITE_URL } } = useRuntimeConfig()

  const origin = process.client ? window.location.origin : SITE_URL

  const base = (origin || SITE_URL).replace(/\/$/, '')

  const redirectTo = `${base}/reset` // <-- без hash

  const { error: e } = await client.auth.resetPasswordForEmail(email, { redirectTo })

  loading.value = false

  if (e) { error.value = e.message; return false }

  return true

}



  async function updatePassword(newPassword: string) {

    loading.value = true; error.value = null

    const { error: e } = await client.auth.updateUser({ password: newPassword })

    loading.value = false

    if (e) { error.value = e.message; return false }

    return true

  }



  async function signOut() {

    loading.value = true; error.value = null

    const { error: e } = await client.auth.signOut()

    loading.value = false

    if (e) { error.value = e.message; return false }

    return true

  }



  return { user, loading, error, signIn, signUp, reset, updatePassword, signOut }

}