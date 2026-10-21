<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Cursos · Administración', robots: 'noindex' })

const { data: products, status, error, refresh } = await useFetch<Product[]>('/api/admin/products', {
  default: () => [],
})

const filter = ref<ProductStatus | 'all'>('all')
const filters = computed(() => [
  { value: 'all' as const, label: 'Todos', count: products.value.length },
  ...(Object.keys(PRODUCT_STATUS) as ProductStatus[]).map(value => ({
    value,
    label: PRODUCT_STATUS[value].label,
    count: products.value.filter(p => p.status === value).length,
  })),
])
const shown = computed(() => (filter.value === 'all' ? products.value : products.value.filter(p => p.status === filter.value)))

const price = (product: Product) => (product.price != null ? formatPrice(Number(product.price), product.currency) : '—')
</script>

<template>
  <div class="section container">
    <header class="page-header">
      <div>
        <h1>Cursos</h1>
        <p class="muted">Crea cursos, ponles precio y decide cuándo salen a la venta.</p>
      </div>
      <NuxtLink to="/admin/cursos/nuevo" class="btn btn-primary">Nuevo curso</NuxtLink>
    </header>

    <div class="filters" role="group" aria-label="Filtrar por estado">
      <button
        v-for="option in filters"
        :key="option.value"
        type="button"
        class="chip"
        :aria-pressed="filter === option.value"
        @click="filter = option.value"
      >
        {{ option.label }} <span class="count">{{ option.count }}</span>
      </button>
    </div>

    <div v-if="error" class="notice notice-warning" role="alert">
      No se pudieron cargar los cursos. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <div v-else-if="status === 'pending'" class="list" aria-busy="true">
      <div v-for="n in 3" :key="n" class="row skeleton" />
    </div>

    <ul v-else-if="shown.length" class="list">
      <li v-for="product in shown" :key="product.id">
        <NuxtLink :to="`/admin/cursos/${product.id}`" class="row">
          <div class="thumb">
            <img v-if="product.image" :src="product.image" alt="">
          </div>
          <div class="main">
            <p class="title">{{ product.title }}</p>
            <p class="key muted">{{ product.course_key ?? `${product.number} · ${product.run}` }}</p>
          </div>
          <ProductStatusBadge :status="product.status" />
          <p class="price">{{ price(product) }}</p>
          <p class="updated muted">{{ formatDate(product.modified) }}</p>
        </NuxtLink>
      </li>
    </ul>

    <div v-else-if="products.length" class="empty">
      <p class="muted">No hay cursos en este estado.</p>
    </div>

    <div v-else class="empty">
      <h2>Aún no hay cursos</h2>
      <p class="muted">Crea el primero: le pones precio e imagen aquí, y los autores arman el contenido en Studio.</p>
      <NuxtLink to="/admin/cursos/nuevo" class="btn btn-primary">Nuevo curso</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

h1 {
  margin: 0 0 6px;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  letter-spacing: -0.03em;
}

.page-header p {
  margin: 0;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
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
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  border-color: var(--ui-primary);
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
}

.count {
  font-size: 0.8rem;
  color: var(--ui-text-muted);
}

.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  grid-template-areas:
    'thumb main status'
    'thumb price updated';
  align-items: center;
  gap: 4px 16px;
  padding: 12px 16px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

a.row:hover {
  border-color: color-mix(in srgb, var(--ui-primary) 30%, transparent);
  box-shadow: var(--brand-shadow);
}

a.row:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

@media (min-width: 900px) {
  .row {
    grid-template-columns: 88px minmax(0, 1fr) 120px 120px 170px;
    grid-template-areas: 'thumb main status price updated';
  }
}

.thumb {
  grid-area: thumb;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.main {
  grid-area: main;
  min-width: 0;
}

.title {
  margin: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key {
  margin: 0;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row > .status {
  grid-area: status;
  justify-self: start;
}

.price {
  grid-area: price;
  margin: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.updated {
  grid-area: updated;
  margin: 0;
  font-size: 0.85rem;
}

@media (max-width: 899px) {
  .row > .status,
  .updated {
    justify-self: end;
  }
}

.skeleton {
  height: 74px;
  background: linear-gradient(90deg, var(--ui-bg) 25%, var(--ui-bg-muted) 50%, var(--ui-bg) 75%);
  background-size: 200% 100%;
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: shimmer 1.4s infinite;
  }
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.empty {
  padding: 48px 24px;
  text-align: center;
  border: 1px dashed var(--ui-border-accented);
  border-radius: var(--brand-radius);
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.empty p {
  margin: 0 auto 20px;
  max-width: 48ch;
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
