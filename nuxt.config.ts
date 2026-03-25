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
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    // Secret used to protect the admin upload API
    // Set ADMIN_SECRET in your .env file
    adminSecret: process.env.ADMIN_SECRET || 'change-this-secret',
    public: {},
  },

  css: ['~/assets/main.css'],
  compatibilityDate: '2025-01-01',
})
