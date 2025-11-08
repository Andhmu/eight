// nuxt.config.ts

import { defineNuxtConfig } from 'nuxt/config'
import * as dotenv from 'dotenv'
dotenv.config()

export default defineNuxtConfig({
  // Включаем девтулы (можно выключить на проде)
  devtools: { enabled: true },

  // Модули проекта
  modules: [
    '@nuxtjs/supabase',
  ],

  /**
   * Supabase
   * Модуль автоматически читает переменные окружения:
   *  - SUPABASE_URL
   *  - SUPABASE_ANON_KEY
   * Здесь отключаем авто-редиректы — управляем ими сами через middleware.
   */
  supabase: {
    redirect: false,
    // если хочешь хранить сессию в cookie между перезагрузками:
    // cookieOptions: { sameSite: 'lax', secure: true }
  },

  /**
   * Runtime Config
   * (не обязательно, но наглядно: пробрасываем ключи в публичную зону)
   * На Vercel добавь эти ENV в Settings → Environment Variables:
   *  SUPABASE_URL, SUPABASE_ANON_KEY
   */
  runtimeConfig: {
    public: {
      supabase: {
        url: process.env.SUPABASE_URL,
        key: process.env.SUPABASE_KEY
      }
    }
  },

  /**
   * Nitro / Vercel
   * Явно укажем пресет для бесшовного деплоя.
   * (Nuxt обычно сам это определяет, но так надёжнее.)
   */
  nitro: {
    preset: 'vercel'
    // если когда-нибудь решишь рендерить на edge:
    // preset: 'vercel-edge'
  },

  /**
   * Общие мелочи (по желанию)
   */
  app: {
    head: {
      title: 'eight ∞',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#CFE3FF' }
      ],
      link: [
        // пример: favicon
        // { rel: 'icon', href: '/favicon.ico' }
      ]
    }
  },

  // TypeScript строгость (удобно для стабильности)
  typescript: {
    strict: true
  },

  // SSR оставляем включённым (по умолчанию true)
  // ssr: true,
  compatibilityDate:'2025-11-08'
})

