// composables/auth/useResetPasswordForm.ts

import { computed, ref, watch } from 'vue'
import { useInlineToast } from '~/composables/ui/useInlineToast'

interface UseResetPasswordFormOptions {
  getServerError: () => string | null
  onSubmit: (password: string) => void
  onSkip: () => void
}

export function useResetPasswordForm(options: UseResetPasswordFormOptions) {
  const password = ref('')
  const password2 = ref('')

  const { toastMessage, toastTitle, toastProgress, showToast, hideToast } =
    useInlineToast('Ошибка', 3000)

  const isMismatch = computed(
    () =>
      password.value.length > 0 &&
      password2.value.length > 0 &&
      password.value !== password2.value,
  )

  function validate(): boolean {
    if (password.value.length < 6) {
      showToast('Пароль должен содержать минимум 6 символов')
      return false
    }
    if (password.value !== password2.value) {
      showToast('Пароли не совпадают')
      return false
    }
    return true
  }

  function handleSubmit() {
    if (!validate()) return
    hideToast()
    options.onSubmit(password.value)
  }

  function handleSkip() {
    options.onSkip()
  }

  watch(
    () => options.getServerError(),
    (val) => {
      if (!val) return
      const lower = val.toLowerCase()
      let text = val
      if (lower.includes('new password should be different from the old password')) {
        text = 'Новый пароль должен отличаться от предыдущего.'
      }
      showToast(text, 'Ошибка', 5000)
    },
  )

  return {
    password,
    password2,
    toastMessage,
    toastTitle,
    toastProgress,
    isMismatch,
    handleSubmit,
    handleSkip,
    hideToast,
  }
}