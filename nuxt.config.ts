// nuxt.config.ts

export default defineNuxtConfig({

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/main.css'],



  // публичные переменные (чтобы были доступны и на клиенте)

  runtimeConfig: {

    public: {

      SUPABASE_URL: process.env.SUPABASE_URL,

      SUPABASE_KEY: process.env.SUPABASE_KEY,

      // очень важно: базовый адрес сайта (локально и на проде)

      SITE_URL: process.env.SITE_URL || 'http://localhost:3000',
      PASSWORD_RESET_MODE: process.env.PASSWORD_RESET_MODE || 'hash'

    },

  },



  app: {

    head: {

      title: 'eight ∞',

      link: [

        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },

        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },

        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap' },

      ],

      meta: [

        { name: 'viewport', content: 'width=device-width, initial-scale=1' },

        { name: 'theme-color', content: '#0f172a' },

      ],

    },

  },



  // отключаем авто-редиректы модуля, всё обрабатываем сами

  supabase: {

    redirect: false,

  },

})