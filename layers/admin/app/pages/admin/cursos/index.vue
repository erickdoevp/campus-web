<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Cursos · Administración', robots: 'noindex' })

const { data: products, status, error, refresh } = await useFetch<Product[]>('/api/admin/products', { default: () => [] })

const search = ref('')
const filter = ref<ProductStatus | 'all'>('all')
const filters = computed(() => [
  { value: 'all' as const, label: 'Todos', count: products.value.length },
  ...(Object.keys(PRODUCT_STATUS) as ProductStatus[]).map(value => ({
    value,
    label: PRODUCT_STATUS[value].label,
    count: products.value.filter(p => p.status === value).length,
  })),
])

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return products.value.filter(p =>
    (filter.value === 'all' || p.status === filter.value)
    && (!term || normalize(`${p.title} ${p.org} ${p.number} ${p.run}`).includes(term)))
})
const narrowed = computed(() => !!search.value.trim() || filter.value !== 'all')
</script>

<template>
  <div class="section container">
    <header class="admin-header rise">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Cursos</h1>
        <p class="muted lead">Crea cursos, organiza sus módulos y lecciones, sube los videos, agrega evaluaciones y define el precio.</p>
      </div>
      <NuxtLink to="/admin/cursos/nuevo" class="btn btn-primary">Nuevo curso</NuxtLink>
    </header>

    <div v-if="error" class="notice notice-error" role="alert">
      No pudimos cargar los cursos. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <div v-if="products.length" class="toolbar rise" style="--i: 1">
        <div class="search">
          <label for="search">Buscar</label>
          <input id="search" v-model="search" type="search" placeholder="Nombre, código o periodo" autocomplete="off">
        </div>
        <div class="filters" role="group" aria-label="Filtrar por estado">
          <button
            v-for="option in filters"
            :key="option.value"
            type="button"
            class="chip"
            :aria-pressed="filter === option.value"
            @click="filter = option.value"
          >
            {{ option.label }} <span class="chip-count">{{ option.count }}</span>
          </button>
        </div>
        <p class="muted count" aria-live="polite">
          {{ narrowed ? `${filtered.length} de ${products.length}` : products.length }} cursos
        </p>
      </div>

      <div v-if="status === 'pending' && !products.length" class="skeleton" aria-busy="true" />

      <ul v-else-if="filtered.length" class="rows rise" style="--i: 2">
        <li v-for="product in filtered" :key="product.id">
          <NuxtLink :to="`/admin/cursos/${product.id}`" class="row">
            <span class="row-mark" aria-hidden="true">
              <img v-if="product.image" :src="product.image" alt="">
              <template v-else>{{ product.title.slice(0, 2) }}</template>
            </span>
            <span class="row-main">
              <span class="row-title">{{ product.title }}</span>
              <span class="muted row-meta">{{ product.course_key ?? `${product.org} / ${product.number} / ${product.run}` }}</span>
            </span>
            <span class="row-side">
              <ProductStatusBadge :status="product.status" />
              <span v-if="product.price != null && Number(product.price) > 0" class="row-price">{{ formatPrice(Number(product.price), product.currency) }}</span>
              <span v-else class="badge badge-muted">Sin precio</span>
            </span>
            <span class="row-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>

      <div v-else-if="narrowed" class="empty">
        <h2>Sin resultados</h2>
        <p class="muted">Ningún curso coincide con la búsqueda o el filtro.</p>
        <button type="button" class="btn btn-secondary" @click="search = ''; filter = 'all'">Ver todos</button>
      </div>

      <div v-else class="empty">
        <h2>Todavía no hay cursos</h2>
        <p class="muted">Crea el primero o toma uno que ya exista en Open edX: después podrás agregar módulos, lecciones, videos y evaluaciones.</p>
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

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.chip:hover {
  border-color: var(--ui-text-highlighted);
}

.chip[aria-pressed='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.chip-count {
  font-size: 0.78rem;
  opacity: 0.7;
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
  overflow: hidden;
  border-radius: var(--brand-radius-sm);
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
  color: var(--ui-primary);
  font-weight: 700;
  text-transform: uppercase;
}

.row-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.row-side {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 6px 14px;
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
  max-width: 48ch;
}
</style>
