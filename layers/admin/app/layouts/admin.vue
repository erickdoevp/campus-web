<script setup lang="ts">
const me = useCmsMe()
const route = useRoute()
</script>

<template>
  <div class="admin-layout">
    <header class="admin-header">
      <div class="container header-inner">
        <NuxtLink to="/admin" class="logo">Campus <span class="tag">Administración</span></NuxtLink>
        <nav class="nav">
          <NuxtLink to="/admin" class="nav-link" :class="{ active: route.path === '/admin' }">Resumen</NuxtLink>
          <NuxtLink to="/admin/cursos" class="nav-link" :class="{ active: route.path.startsWith('/admin/cursos') }">Cursos</NuxtLink>
          <NuxtLink to="/admin/ventas" class="nav-link" :class="{ active: route.path.startsWith('/admin/ventas') }">Ventas</NuxtLink>
          <NuxtLink to="/" class="nav-link muted">Ver sitio</NuxtLink>
          <span v-if="me" class="user" :title="me.email">{{ me.username }}</span>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  padding-bottom: 56px;
}

.admin-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--ui-bg);
  border-bottom: 1px solid var(--ui-border);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 24px;
  min-height: 60px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ui-text-highlighted);
  text-decoration: none;
}

.tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
}

.nav {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 0.95rem;
}

.nav-link {
  color: var(--ui-text-highlighted);
  font-weight: 500;
  text-decoration: none;
}

.nav-link.active {
  color: var(--ui-primary);
}

.nav-link.muted {
  color: var(--ui-text-muted);
}

.user {
  font-weight: 500;
  color: var(--ui-text-muted);
}
</style>
