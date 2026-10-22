<script setup lang="ts">
const admin = useAdminUser()
const user = useEdxUser()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()
const logoutUrl = computed(() => user.value && `${user.value.header_urls.logout}?redirect_url=${encodeURIComponent(requestUrl.origin + '/')}`)
</script>

<template>
  <div class="layout">
    <header class="site-header">
      <div class="container header-inner">
        <NuxtLink to="/admin" class="logo">Campus <span class="tag">Administración</span></NuxtLink>
        <nav class="nav" aria-label="Administración">
          <NuxtLink to="/admin" class="nav-link" :class="{ active: $route.path.startsWith('/admin') }">Cursos</NuxtLink>
          <a :href="config.public.studioUrl" class="nav-link" target="_blank" rel="noopener">Studio</a>
          <NuxtLink to="/" class="nav-link">Ver sitio</NuxtLink>
          <span v-if="admin" class="user" :title="admin.email">{{ admin.username }}</span>
          <a v-if="logoutUrl" :href="logoutUrl" class="nav-link">Salir</a>
        </nav>
      </div>
    </header>

    <main>
      <slot />
    </main>
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
  padding-bottom: 56px;
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
  flex-wrap: wrap;
  gap: 8px 24px;
  min-height: 68px;
}

.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 1.25rem;
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
  flex-wrap: wrap;
  gap: 8px 22px;
  padding-bottom: 8px;
}

@media (min-width: 768px) {
  .nav {
    padding-bottom: 0;
  }
}

.nav-link {
  color: var(--ui-text-highlighted);
  font-weight: 500;
  text-decoration: none;
}

.nav-link.active {
  color: var(--ui-primary);
}

.user {
  font-weight: 500;
  color: var(--ui-text-muted);
}
</style>

<!-- Shared by every admin page. -->
<style>
.admin-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 32px;
}

.admin-header h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 4.4vw, 2.8rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
}

.admin-header .lead {
  margin: 0;
  font-size: 1.05rem;
  max-width: 56ch;
}

.admin-panel {
  padding: 24px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
}

@media (min-width: 768px) {
  .admin-panel {
    padding: 32px;
  }
}

.admin-panel + .admin-panel {
  margin-top: 24px;
}

.admin-panel h2 {
  margin: 0 0 4px;
  font-size: 1.2rem;
}

.admin-panel > .panel-intro {
  margin: 0 0 24px;
  font-size: 0.95rem;
}

.field + .field,
.field-row + .field,
.field + .field-row,
.field-row + .field-row {
  margin-top: 20px;
}

.field-row {
  display: grid;
  gap: 20px;
}

@media (min-width: 640px) {
  .field-row {
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  }
}

.field label {
  font-size: 0.92rem;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 0.85rem;
  color: var(--ui-text-muted);
}

.field select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  font: inherit;
  background: var(--ui-bg);
}

.field textarea {
  resize: vertical;
}

.field [aria-invalid='true'] {
  border-color: var(--ui-color-error-500);
}

.input-prefix {
  position: relative;
}

.input-prefix > span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-muted);
  pointer-events: none;
}

.input-prefix > input {
  padding-left: 30px;
  font-variant-numeric: tabular-nums;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
}

.btn[disabled] {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-small {
  padding: 7px 14px;
  font-size: 0.88rem;
}

.btn-danger {
  background: var(--ui-bg);
  border-color: var(--ui-border);
  color: var(--ui-color-error-600);
}

.btn-danger:hover {
  border-color: var(--ui-color-error-600);
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  cursor: pointer;
}

.link-button:hover {
  color: var(--ui-text-highlighted);
}

.link-button.danger:hover {
  color: var(--ui-color-error-600);
}

.badge-warning {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}

.badge-success {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.badge-muted {
  background: var(--ui-border);
  color: var(--ui-text-muted);
}

.notice-error {
  background: var(--ui-color-error-50);
  color: var(--ui-color-error-800);
}

.notice .link-button {
  margin-left: 8px;
  color: inherit;
  text-decoration: underline;
}
</style>
