<script setup lang="ts">
const user = useEdxUser()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

// After logging in, Open edX sends the user back to the page they were on.
const loginUrl = computed(() => `${config.public.lmsUrl}/login?next=${encodeURIComponent(requestUrl.href)}`)
const registerUrl = computed(() => `${config.public.lmsUrl}/register?next=${encodeURIComponent(requestUrl.href)}`)
const logoutUrl = computed(() => user.value && `${user.value.header_urls.logout}?redirect_url=${encodeURIComponent(requestUrl.origin + '/')}`)
// Not header_urls.learner_profile: the LMS builds it with urljoin(PROFILE_MICROFRONTEND_URL,
// '/u/<username>'), which drops the MFE's /profile path and gives a blank page.
const profileUrl = computed(() => user.value && `${config.public.profileUrl}${encodeURIComponent(user.value.username)}`)

// Contadores get a link to the admin area. Asked only for logged-in users, in the browser.
const { data: cmsMe } = useLazyFetch<CmsMe>('/api/admin/me', { server: false, immediate: !!user.value })

const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => {
  menuOpen.value = false
  userMenuOpen.value = false
})

// User dropdown (Perfil, Cuenta, Cerrar sesión), like the Open edX header's.
// Closes on a click outside it or on Escape.
const userMenuOpen = ref(false)
const userMenu = ref<HTMLElement>()
function onDocumentClick(event: MouseEvent) {
  if (!userMenu.value?.contains(event.target as Node)) userMenuOpen.value = false
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') userMenuOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

// Placeholder contact details until the real ones are defined. The Open edX MFEs
// show the same footer, with CAMPUS_FOOTER in tutor-plugins/campusmenu.py: change both together.
const contact = {
  email: 'contacto@local.openedx.io',
  phone: '+52 55 1234 5678',
  hours: 'Lunes a viernes, 9:00 a 18:00',
  address: ['Av. Paseo de la Reforma 222, piso 5', 'Col. Juárez, Cuauhtémoc', '06600 Ciudad de México, CDMX'],
  lat: 19.4285,
  lon: -99.1617,
}
// OpenStreetMap's embed needs no API key.
const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${contact.lon - 0.006},${contact.lat - 0.004},${contact.lon + 0.006},${contact.lat + 0.004}&layer=mapnik&marker=${contact.lat},${contact.lon}`
const mapLinkUrl = `https://www.openstreetmap.org/?mlat=${contact.lat}&mlon=${contact.lon}#map=17/${contact.lat}/${contact.lon}`
</script>

<template>
  <div class="layout">
    <header class="site-header">
      <div class="header-inner">
        <NuxtLink to="/" class="header-logo">
          <img src="/logo.svg" alt="Campus">
        </NuxtLink>

        <button class="menu-toggle" :aria-expanded="menuOpen" aria-controls="main-nav" @click="menuOpen = !menuOpen">
          Menú
        </button>

        <nav id="main-nav" class="nav" :class="{ open: menuOpen }">
          <a v-if="user" :href="config.public.learnerDashboardUrl">Mis cursos</a>
          <NuxtLink to="/cursos">Cursos</NuxtLink>
          <NuxtLink to="/eventos">Eventos</NuxtLink>
          <NuxtLink v-if="user && cmsMe?.is_contador" to="/admin">Administración</NuxtLink>

          <div class="nav-account">
            <div v-if="user" ref="userMenu" class="user-menu">
              <button
                class="user-menu-toggle"
                aria-haspopup="true"
                aria-controls="user-menu"
                :aria-expanded="userMenuOpen"
                :title="user.email"
                @click="userMenuOpen = !userMenuOpen"
              >
                {{ user.username }}
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <div v-show="userMenuOpen" id="user-menu" class="user-menu-content">
                <a :href="profileUrl!">Perfil</a>
                <a :href="user.header_urls.account_settings">Cuenta</a>
                <a :href="logoutUrl!">Cerrar sesión</a>
              </div>
            </div>
            <template v-else>
              <a :href="loginUrl" class="account-link">Iniciar sesión</a>
              <a :href="registerUrl" class="btn btn-primary">Crear cuenta</a>
            </template>
          </div>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <NuxtLink to="/" class="footer-logo">
            <img src="/logo.svg" alt="Campus">
          </NuxtLink>
          <p>Cursos en línea con acceso de por vida.</p>
          <nav class="footer-nav" aria-label="Pie de página">
            <NuxtLink to="/cursos">Cursos</NuxtLink>
            <NuxtLink to="/eventos">Eventos</NuxtLink>
          </nav>
        </div>

        <div>
          <h2 class="footer-heading">Contacto</h2>
          <ul class="footer-list">
            <li><a :href="`mailto:${contact.email}`">{{ contact.email }}</a></li>
            <li><a :href="`tel:${contact.phone.replace(/\s/g, '')}`">{{ contact.phone }}</a></li>
            <li>{{ contact.hours }}</li>
          </ul>
        </div>

        <div>
          <h2 class="footer-heading">Dirección</h2>
          <address class="footer-list">
            <span v-for="line in contact.address" :key="line">{{ line }}</span>
          </address>
          <a :href="mapLinkUrl" target="_blank" rel="noopener" class="footer-map-link">Cómo llegar</a>
        </div>

        <div class="footer-map">
          <iframe
            :src="mapEmbedUrl"
            title="Mapa de la ubicación de Campus"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
        </div>
      </div>

      <div class="container footer-bottom">
        © {{ new Date().getFullYear() }} Campus. Todos los derechos reservados.
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--ui-color-neutral-800);
  border-bottom: 1px solid var(--ui-color-neutral-700);
}

/* Same metrics as the Open edX MFE headers (tutor-plugins/campusmenu.py). */
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: 0 16px;
}

.header-logo {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-right: 32px;
}

.header-logo img {
  display: block;
  height: 28px;
}

.nav {
  display: none;
}

.nav a {
  color: #fff;
  text-decoration: none;
  font-weight: 500;
}

.nav > a {
  border-bottom: 2px solid transparent;
}

.nav > a:hover {
  border-bottom-color: var(--ui-color-primary-300);
}

.nav > a.router-link-active {
  color: var(--ui-color-primary-300);
}

.nav.open {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: absolute;
  top: 64px;
  left: 0;
  right: 0;
  padding: 20px 16px 24px;
  background: var(--ui-color-neutral-800);
  border-bottom: 1px solid var(--ui-color-neutral-700);
}

.nav-account {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.nav-account .btn-primary {
  color: var(--ui-text-inverted);
}

.account-link {
  font-weight: 500;
}

/* Same look as the Open edX header's user button (tutor-plugins/campusmenu.py). */
.user-menu {
  position: relative;
}

.user-menu-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: var(--ui-radius);
  background: transparent;
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.user-menu-toggle:hover,
.user-menu-toggle[aria-expanded="true"] {
  background: rgba(255, 255, 255, 0.1);
}

.user-menu-content {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.user-menu-content a {
  padding: 10px 0;
  color: #fff;
  text-decoration: none;
  font-weight: 500;
}

.menu-toggle {
  padding: 8px 14px;
  border: 1px solid var(--ui-color-neutral-600);
  border-radius: 999px;
  background: transparent;
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

@media (min-width: 900px) {
  .header-inner {
    justify-content: flex-start;
    padding: 0 24px;
  }

  .menu-toggle {
    display: none;
  }

  .nav,
  .nav.open {
    display: flex;
    flex: 1;
    flex-direction: row;
    align-items: center;
    gap: 24px;
    position: static;
    padding: 0;
    background: none;
    border: 0;
  }

  .nav > a {
    padding: 20px 0 18px;
    line-height: 24px;
  }

  .nav-account {
    margin-left: auto;
  }

  .user-menu-content {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 224px;
    margin: 0;
    padding: 6px 0;
    background: var(--ui-bg);
    border-radius: 6px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.15);
  }

  .user-menu-content a {
    padding: 10px 16px;
    color: var(--ui-text-highlighted);
    font-weight: 400;
  }

  .user-menu-content a:hover {
    background: var(--ui-bg-muted);
  }
}

/* Same background as the header. */
.site-footer {
  margin-top: 56px;
  padding: 48px 0 24px;
  background: var(--ui-color-neutral-800);
  border-top: 1px solid var(--ui-color-neutral-700);
  color: var(--ui-color-neutral-300);
}

.footer-grid {
  display: grid;
  gap: 32px;
}

.footer-logo img {
  display: block;
  height: 28px;
}

.footer-brand p {
  margin: 12px 0 16px;
}

.footer-nav {
  display: flex;
  gap: 24px;
}

.footer-heading {
  margin: 0 0 12px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
}

.footer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-style: normal;
}

.site-footer a {
  color: var(--ui-color-neutral-300);
  text-decoration: none;
}

.site-footer a:hover {
  color: var(--ui-color-primary-300);
}

.footer-map-link {
  display: inline-block;
  margin-top: 12px;
  font-weight: 500;
}

.footer-map iframe {
  display: block;
  width: 100%;
  height: 200px;
  border: 1px solid var(--ui-color-neutral-700);
  border-radius: var(--ui-radius);
}

.footer-bottom {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--ui-color-neutral-700);
  font-size: 0.875rem;
  color: var(--ui-color-neutral-400);
}

@media (min-width: 640px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 900px) {
  .footer-grid {
    grid-template-columns: 1.2fr 1fr 1fr 1.4fr;
  }
}
</style>
