// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'es-MX' },
      titleTemplate: '%s · Campus',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
      ],
    },
  },

  // Override per environment with NUXT_* env vars, e.g.
  // NUXT_OPENEDX_LMS_URL / NUXT_PUBLIC_LMS_URL.
  runtimeConfig: {
    // Used by the Nuxt server to call Open edX APIs.
    openedxLmsUrl: 'http://local.openedx.io:8000',
    public: {
      // Used in links the browser follows.
      lmsUrl: 'http://local.openedx.io:8000',
      learnerDashboardUrl: 'http://apps.local.openedx.io:1996/learner-dashboard/',
      learningMfeUrl: 'http://apps.local.openedx.io:2000/learning',
    },
  },

  content: {
    // Node >= 22.5 ships SQLite, so no native module is needed.
    experimental: { sqliteConnector: 'native' },
  },

  // The site must live on a subdomain of the LMS cookie domain to read the
  // edX login cookies: http://www.local.openedx.io:3000 in development.
  devServer: { port: 3000 },
  vite: {
    server: { allowedHosts: ['.local.openedx.io'] },
  },
})
