export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      title: 'dravver',
      meta: [
        { name: 'description', content: 'Submit a prompt. Get a drawing back. Eventually.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' },
      ],
      link: [
        { rel: 'preload', href: '/OhnoSoftieVariable.ttf', as: 'font', type: 'font/ttf', crossorigin: '' },
      ],
    },
  },

  runtimeConfig: {
    adminSecret: process.env.ADMIN_SECRET || '',
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    public: {},
  },

  nitro: {
    preset: 'vercel',
  },

  css: ['~/assets/main.css'],
  compatibilityDate: '2025-01-01',
})
