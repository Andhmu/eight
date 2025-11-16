// nuxt.config.ts

export default defineNuxtConfig({

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/styles/main.css'],

  runtimeConfig: {

    public: {

      SUPABASE_URL: process.env.SUPABASE_URL,

      SUPABASE_KEY: process.env.SUPABASE_KEY,

      SITE_URL: process.env.SITE_URL || 'http://localhost:3000',

      PASSWORD_RESET_MODE: process.env.PASSWORD_RESET_MODE || 'hash',

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

supabase: {
  redirect: false,
  clientOptions: {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
},

})