// composables/feed/useNewUsers.ts
import { ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

interface NewUser {
  id: string
  username: string | null
  created_at: string | null
}

const state = {
  users: ref<NewUser[]>([]),
  loading: ref(false),
  error: ref<string | null>(null),
  initialized: ref(false),
}

export function useNewUsers() {
  const client = useSupabaseClient()
  const authUser = useSupabaseUser()

  /**
   * Загружаем пользователей из Supabase.
   * Если передан search — ищем по всей базе (profiles.username ilike %search%).
   */
  const fetchUsers = async (search?: string) => {
    if (state.loading.value) return

    state.loading.value = true
    state.error.value = null

    const raw = authUser.value as any
    const currentId: string | undefined = raw?.id ?? raw?.sub ?? undefined

    let query = client
      .from('profiles')
      .select(
        `
        id,
        username,
        created_at
      `,
      )

    const q = (search || '').trim()
    if (q) {
      // поиск по всей базе по username
      query = query.ilike('username', `%${q}%`)
    }

    // исключаем текущего пользователя
    if (currentId) {
      query = query.neq('id', currentId)
    }

    // упорядочиваем и ограничиваем выдачу
    query = query.order('created_at', { ascending: false }).limit(50)

    const { data, error } = await query

    if (error) {
      console.error('Error loading new users:', error)
      state.error.value = error.message
      state.loading.value = false
      return
    }

    let list = (data || []) as NewUser[]

    // дополнительный фильтр на всякий случай
    if (currentId) {
      list = list.filter((u) => u.id !== currentId)
    }

    state.users.value = list
    state.loading.value = false
    state.initialized.value = true
  }

  return {
    users: state.users,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,
    fetchUsers,
  }
}