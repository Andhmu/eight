<!-- pages/reset.vue -->



<template>

  <div class="stack">

    <div class="card">

      <!-- stage: проверяем ссылку -->

      <template v-if="stage === 'checking'">

        <h2>Сброс пароля</h2>

        <p>Проверяем ссылку…</p>

      </template>



      <!-- stage: форма нового пароля -->

      <template v-else-if="stage === 'form'">

        <h2>Новый пароль</h2>



        <!-- ВАЖНО: novalidate — отключаем нативные попапы браузера -->

        <form class="form" novalidate @submit.prevent="save">

          <div class="field">

            <label>Пароль</label>

            <input

              v-model="password"

              type="password"

              class="input"

            />

          </div>



          <div class="field">

            <label>Повторите пароль</label>

            <input

              v-model="password2"

              type="password"

              class="input"

            />

          </div>



          <!-- Тост под полями пароля -->

          <transition name="slide-fade">

            <div v-if="toastMessage" class="toast toast--inline" style="margin-top:8px">

              <div class="toast__content">

                <b v-if="toastTitle">{{ toastTitle }}</b>

                <template v-if="toastTitle"><br /></template>

                {{ toastMessage }}

              </div>

              <div class="toast__progress" :style="{ width: toastProgress + '%' }"></div>

            </div>

          </transition>



          <div class="actions" style="justify-content: space-between; margin-top: 8px;">

            <button

              class="btn btn--light"

              type="button"

              :disabled="loading"

              @click="continueWithoutChange"

            >

              Продолжить без смены пароля

            </button>



            <button

              class="btn btn--primary"

              type="submit"

              :disabled="loading"

            >

              Сохранить

            </button>

          </div>

        </form>

      </template>



      <!-- stage: пароль успешно изменён -->

      <template v-else-if="stage === 'done'">

        <h2>Готово</h2>

        <p>

          Пароль изменён. Можно

          <NuxtLink class="link" to="/login">войти</NuxtLink>.

        </p>

      </template>



      <!-- stage: неверная или устаревшая ссылка -->

      <template v-else>

        <h2>Сброс пароля</h2>

        <p>Некорректная или устаревшая ссылка для сброса пароля.</p>

        <NuxtLink class="link" to="/forgot">

          Отправить письмо ещё раз

        </NuxtLink>



        <!-- показываем только «чистые» ошибки, без служебных -->

        <p

          v-if="filteredError"

          class="error"

          style="margin-top: 8px"

        >

          {{ filteredError }}

        </p>

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

const password2 = ref('')



const USED_PREFIX = 'reset-used:'

const LOCK_KEY = 'reset-lock'

let tokenId: string | null = null



/** --- ТОСТЫ ДЛЯ ФОРМЫ --- */

const toastMessage = ref('')

const toastTitle = ref('')

const toastProgress = ref(0)

let toastTimer: number | null = null



function startToastProgress(ms = 3000) {

  toastProgress.value = 0

  if (toastTimer) {

    clearInterval(toastTimer)

    toastTimer = null

  }

  const started = Date.now()

  toastTimer = window.setInterval(() => {

    const p = Math.min(100, ((Date.now() - started) / ms) * 100)

    toastProgress.value = p

    if (p >= 100) {

      hideToast()

    }

  }, 40)

}



function showToast(message: string, title = 'Ошибка', ms = 3000) {

  toastTitle.value = title

  toastMessage.value = message

  startToastProgress(ms)

}



function hideToast() {

  toastMessage.value = ''

  toastTitle.value = ''

  toastProgress.value = 100

  if (toastTimer) {

    clearInterval(toastTimer)

    toastTimer = null

  }

}



/** парсим hash "#access_token=..." в объект */

function parseHash(h: string) {

  const s = h.startsWith('#') ? h.slice(1) : h

  return Object.fromEntries(new URLSearchParams(s))

}



/** убираем query/hash из адреса, оставляя /reset */

function replaceUrlClean() {

  history.replaceState({}, '', '/reset')

}



/** ждём пока Supabase создаст сессию */

async function waitSession(msTotal = 3000, step = 250) {

  const tries = Math.ceil(msTotal / step)

  for (let i = 0; i < tries; i++) {

    const { data } = await client.auth.getSession()

    if (data.session) return true

    await new Promise(resolve => setTimeout(resolve, step))

  }

  return false

}



/** пробуем вытащить id токена (для USED_PREFIX) */

function extractTokenId(u: URL) {

  const q = u.searchParams

  const code = q.get('code')

  if (code) return code



  const h = parseHash(u.hash)

  if (h.access_token) return String(h.access_token)



  return null

}



/** человекочитаемая ошибка только для стадии invalid */

const filteredError = computed(() => {

  if (!error.value) return null

  const msg = error.value.toLowerCase()



  // служебные ошибки Supabase — скрываем

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



/** несовпадение паролей */

const isMismatch = computed(() => password.value !== password2.value)



/** основная логика разбора ссылки из письма */

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

        error.value = null           // очищаем служебные ошибки

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

        refresh_token: h.refresh_token

      })



      if (!e && (await waitSession())) {

        if (tokenId) sessionStorage.setItem(USED_PREFIX + tokenId, '1')

        sessionStorage.setItem(LOCK_KEY, '1')

        replaceUrlClean()

        error.value = null           // тоже очищаем

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

      error.value = null             // в форме не показываем тех.ошибки

      stage.value = 'form'

    } else {

      stage.value = 'invalid'

    }

  } catch (e: any) {

    error.value = e?.message || 'Unexpected error'

    stage.value = 'invalid'

  }

})



/** сохранить новый пароль */

async function save() {

  loading.value = true

  error.value = null

  hideToast()



  // клиентская валидация

  if (password.value.length < 6) {

    loading.value = false

    showToast('Минимальная длина пароля — 6 символов')

    return

  }



  if (isMismatch.value) {

    loading.value = false

    showToast('Пароли не совпадают')

    return

  }



  const { error: e } = await client.auth.updateUser({

    password: password.value

  })

  loading.value = false



  if (e) {

    // показываем текст Supabase в тосте (например "New password should be different...")

    showToast(e.message)

    return

  }



  // пароль сменён — очищаем локи

  sessionStorage.removeItem(LOCK_KEY)

  if (tokenId) sessionStorage.removeItem(USED_PREFIX + tokenId)



  stage.value = 'done'

}



/** просто продолжить без смены пароля */

function continueWithoutChange() {

  navigateTo('/feed')

}

</script>