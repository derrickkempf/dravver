export default defineNuxtConfig({
  devtools: { enabled: true },

  app: {
    head: {
      title: 'dravver',
      meta: [
        { name: 'description', content: 'Submit a prompt. Get a drawing back. Eventually.' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#000000' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // Set ADMIN_SECRET and BLOB_READ_WRITE_TOKEN in Vercel environment variables
    adminSecret: process.env.ADMIN_SECRET || '',
    blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN || '',
    public: {},
  },

  nitro: {
    // Ensures Vercel serverless functions work correctly
    preset: 'vercel',
  },

  css: ['~/assets/main.css'],
  compatibilityDate: '2025-01-01',
})
