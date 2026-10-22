<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Administración' })

const { data: courses, status, error, refresh } = await useFetch('/api/admin/courses', { default: () => [] })

const search = ref('')
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return courses.value.filter(c => !term || normalize(`${c.name} ${c.org} ${c.number} ${c.run}`).includes(term))
})
</script>

<template>
  <div class="section container">
    <header class="admin-header rise">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Cursos</h1>
        <p class="muted lead">Crea cursos, organiza sus módulos y lecciones, sube los videos y define el precio.</p>
      </div>
      <NuxtLink to="/admin/cursos/nuevo" class="btn btn-primary">Nuevo curso</NuxtLink>
    </header>

    <div v-if="error" class="notice notice-error" role="alert">
      {{ apiErrorMessage(error, 'No pudimos cargar los cursos.') }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <div v-if="courses.length" class="toolbar rise" style="--i: 1">
        <div class="search">
          <label for="search">Buscar</label>
          <input id="search" v-model="search" type="search" placeholder="Nombre, organización o número" autocomplete="off">
        </div>
        <p class="muted count" aria-live="polite">
          {{ search.trim() ? `${filtered.length} de ${courses.length}` : courses.length }} cursos
        </p>
      </div>

      <div v-if="status === 'pending' && !courses.length" class="skeleton" aria-busy="true" />

      <ul v-else-if="filtered.length" class="rows rise" style="--i: 2">
        <li v-for="course in filtered" :key="course.id">
          <NuxtLink :to="adminCoursePath(course.id)" class="row">
            <span class="row-mark" aria-hidden="true">{{ course.org.slice(0, 2) }}</span>
            <span class="row-main">
              <span class="row-title">{{ course.name }}</span>
              <span class="muted row-meta">{{ course.org }} / {{ course.number }} / {{ course.run }}</span>
            </span>
            <span v-if="course.price" class="row-price">{{ formatPrice(course.price, course.currency) }}</span>
            <span v-else class="badge badge-muted">Sin precio</span>
            <span class="row-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>

      <div v-else-if="search.trim()" class="empty">
        <h2>Sin resultados</h2>
        <p class="muted">Ningún curso coincide con “{{ search.trim() }}”.</p>
        <button type="button" class="btn btn-secondary" @click="search = ''">Limpiar búsqueda</button>
      </div>

      <div v-else class="empty">
        <h2>Todavía no hay cursos</h2>
        <p class="muted">Crea el primero: después podrás agregar módulos, lecciones y videos.</p>
        <NuxtLink to="/admin/cursos/nuevo" class="btn btn-primary">Crear curso</NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
}

.search {
  flex: 1 1 320px;
  max-width: 420px;
}

.search label {
  font-size: 0.9rem;
}

.count {
  margin: 0;
  font-size: 0.9rem;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
}

.rows li + li {
  border-top: 1px solid var(--ui-border);
}

.row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px 16px;
  padding: 16px 18px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s;
}

.row:hover {
  background: var(--ui-color-primary-50);
}

.row:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.row-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--brand-radius-sm);
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
  color: var(--ui-primary);
  font-weight: 700;
  text-transform: uppercase;
}

.row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row-title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  font-size: 0.88rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-price {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.row-arrow {
  display: none;
}

@media (min-width: 768px) {
  .row {
    grid-template-columns: 44px minmax(0, 1fr) auto 24px;
    padding: 18px 24px;
  }

  .row-arrow {
    display: block;
    color: var(--ui-text-muted);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s;
  }

  .row:hover .row-arrow {
    color: var(--ui-primary);
    transform: translateX(4px);
  }
}

.skeleton {
  height: 240px;
  border-radius: var(--brand-radius);
  background: linear-gradient(100deg, var(--ui-border) 30%, var(--ui-bg) 50%, var(--ui-border) 70%);
  background-size: 300% 100%;
}

.empty {
  padding: 56px 24px;
  border: 1px dashed var(--ui-border);
  border-radius: var(--brand-radius);
  text-align: center;
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.empty p {
  margin: 0 auto 24px;
  max-width: 44ch;
}
</style>
