export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      title: 'dravver',
      meta: [
        { name: 'description', content: 'Submit a prompt. Get a drawing back. Eventually.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff' },

        // Social share / link preview
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'dravver' },
        { property: 'og:title', content: 'dravver: What shall I draw?' },
        { property: 'og:description', content: 'Submit a prompt. Get a drawing back. Eventually.' },
        { property: 'og:url', content: 'https://dravver.vercel.app' },
        { property: 'og:image', content: 'https://dravver.vercel.app/og.png' },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'A hand-drawn DEWD face above the headline “What shall I draw?”' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'dravver: What shall I draw?' },
        { name: 'twitter:description', content: 'Submit a prompt. Get a drawing back. Eventually.' },
        { name: 'twitter:image', content: 'https://dravver.vercel.app/og.png' },
      ],
      link: [
        // The tab favicon is cycled by plugins/favicon.client.ts; /favicon.ico is the fallback
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
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
