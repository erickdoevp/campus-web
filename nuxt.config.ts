// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/content'],
  css: ['~/assets/css/main.css'],

  ui: {
    // Light only for now: the brand palette has not been tuned for dark mode.
    colorMode: false,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es-MX' },
      titleTemplate: '%s · Campus',
    },
  },

  // Override per environment with NUXT_* env vars, e.g.
  // NUXT_OPENEDX_LMS_URL / NUXT_PUBLIC_LMS_URL.
  runtimeConfig: {
    // Used by the Nuxt server to call Open edX APIs.
    openedxLmsUrl: 'http://local.openedx.io:8000',
    // Campus CMS (courses, prices, sales), called by the admin area's server routes.
    campusCmsUrl: 'http://campus-cms.local.openedx.io:8010',
    // Studio, called by the admin area's server routes to edit course content.
    openedxStudioUrl: 'http://studio.local.openedx.io:8001',
    // Where uploaded videos are stored, and the public URL they are served
    // from (empty: this site's /media/videos).
    adminVideoDir: '.data/videos',
    adminVideoBaseUrl: '',
    public: {
      // Used in links the browser follows.
      lmsUrl: 'http://local.openedx.io:8000',
      studioUrl: 'http://studio.local.openedx.io:8001',
      learnerDashboardUrl: 'http://apps.local.openedx.io:1996/learner-dashboard/',
      // The LMS's PROFILE_MICROFRONTEND_URL; the username is appended to it.
      profileUrl: 'http://apps.local.openedx.io:1995/profile/u/',
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
