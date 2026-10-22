<script setup lang="ts">
const user = useEdxUser()
const isStaff = useEdxStaff()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

// After logging in, Open edX sends the user back to the page they were on.
const loginUrl = computed(() => `${config.public.lmsUrl}/login?next=${encodeURIComponent(requestUrl.href)}`)
const registerUrl = computed(() => `${config.public.lmsUrl}/register?next=${encodeURIComponent(requestUrl.href)}`)
const logoutUrl = computed(() => user.value && `${user.value.header_urls.logout}?redirect_url=${encodeURIComponent(requestUrl.origin + '/')}`)

const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <div class="layout">
    <header class="site-header">
      <div class="container header-inner">
        <NuxtLink to="/" class="logo">Campus</NuxtLink>

        <button class="menu-toggle" :aria-expanded="menuOpen" aria-controls="main-nav" @click="menuOpen = !menuOpen">
          Menú
        </button>

        <nav id="main-nav" class="nav" :class="{ open: menuOpen }">
          <NuxtLink to="/cursos">Cursos</NuxtLink>
          <NuxtLink to="/eventos">Eventos</NuxtLink>

          <div class="nav-account">
            <template v-if="user">
              <NuxtLink v-if="isStaff" to="/admin" class="account-link">Administración</NuxtLink>
              <a :href="config.public.learnerDashboardUrl" class="btn btn-secondary">Mis cursos</a>
              <a :href="user.header_urls.account_settings" class="account-link" :title="user.email">
                {{ user.username }}
              </a>
              <a :href="logoutUrl!" class="account-link">Salir</a>
            </template>
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
      <div class="container footer-inner">
        <div>
          <p class="logo">Campus</p>
          <p class="muted">Cursos en línea con acceso de por vida.</p>
        </div>
        <nav class="footer-nav">
          <NuxtLink to="/cursos">Cursos</NuxtLink>
          <NuxtLink to="/eventos">Eventos</NuxtLink>
        </nav>
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
  background: color-mix(in srgb, var(--ui-bg-muted) 92%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--ui-border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 68px;
}

.logo {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
  text-decoration: none;
}

.nav {
  display: none;
}

.nav a {
  color: var(--ui-text-highlighted);
  text-decoration: none;
  font-weight: 500;
}

.nav > a.router-link-active {
  color: var(--ui-primary);
}

.nav.open {
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: absolute;
  top: 68px;
  left: 0;
  right: 0;
  padding: 20px 16px 24px;
  background: var(--ui-bg-muted);
  border-bottom: 1px solid var(--ui-border);
}

.nav-account {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.nav-account .btn {
  color: inherit;
}

.nav-account .btn-primary {
  color: var(--ui-text-inverted);
}

.account-link {
  font-weight: 500;
}

.menu-toggle {
  padding: 8px 14px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

@media (min-width: 900px) {
  .menu-toggle {
    display: none;
  }

  .nav,
  .nav.open {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 28px;
    position: static;
    padding: 0;
    background: none;
    border: 0;
  }

  .nav-account {
    margin-left: 12px;
  }
}

.site-footer {
  margin-top: 56px;
  border-top: 1px solid var(--ui-border);
  padding: 40px 0;
}

.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24px;
}

.footer-inner p {
  margin: 0 0 4px;
}

.footer-nav {
  display: flex;
  gap: 24px;
}

.footer-nav a {
  color: var(--ui-text-muted);
  text-decoration: none;
}
</style>
