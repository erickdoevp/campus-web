<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Ventas · Administración', robots: 'noindex' })

const route = useRoute()
const router = useRouter()

// Filters live in the URL (?estado=&acceso=&q=&pagina=) so the dashboard can link here.
const filters = computed(() => ({
  estado: String(route.query.estado ?? ''),
  acceso: String(route.query.acceso ?? ''),
  q: String(route.query.q ?? ''),
  pagina: Math.max(1, Number(route.query.pagina) || 1),
}))
function setFilter(changes: Partial<Record<'estado' | 'acceso' | 'q' | 'pagina', string | number>>) {
  const query = { ...route.query, ...changes, ...('pagina' in changes ? {} : { pagina: undefined }) }
  router.replace({ query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== '' && v != null)) })
}

const search = ref(filters.value.q)
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => setFilter({ q: value.trim() }), 300)
})

const { data, status, error, refresh } = await useFetch<CmsPage<AdminOrder>>('/api/admin/orders', {
  query: computed(() => ({
    status: filters.value.estado || undefined,
    access: filters.value.acceso || undefined,
    q: filters.value.q || undefined,
    page: filters.value.pagina,
  })),
})
const page = ref(data.value)
watch(data, (value) => { if (value) page.value = value })
const loading = computed(() => status.value === 'pending' && !!page.value)
const PAGE_SIZE = 50
const pages = computed(() => Math.max(1, Math.ceil((page.value?.count ?? 0) / PAGE_SIZE)))

const retrying = ref<number | null>(null)
const retryMessage = ref<{ id: number, kind: 'success' | 'warning', text: string } | null>(null)
async function retry(order: AdminOrder) {
  retrying.value = order.id
  retryMessage.value = null
  try {
    const updated = await $fetch<AdminOrder>(`/api/admin/orders/${order.id}/retry-access`, { method: 'POST' })
    Object.assign(order, updated)
    retryMessage.value = updated.access === 'error'
      ? { id: order.id, kind: 'warning', text: 'Open edX volvió a fallar; el motivo está abajo. Se reintenta solo cada día.' }
      : { id: order.id, kind: 'success', text: 'Listo: el acceso ya quedó en Open edX.' }
  }
  catch (err) {
    retryMessage.value = { id: order.id, kind: 'warning', text: cmsErrors(err).general || 'No se pudo reintentar.' }
  }
  finally {
    retrying.value = null
  }
}

const dateOf = (order: AdminOrder) => order.paid_at ?? order.created
</script>

<template>
  <div class="section container">
    <header class="page-header">
      <h1>Ventas</h1>
      <p class="muted">Cada intento de compra: lo que pasó con el pago y con el acceso al curso.</p>
    </header>

    <div class="filters">
      <div class="field">
        <label for="search">Comprador</label>
        <input id="search" v-model="search" type="search" placeholder="Usuario o correo" autocomplete="off">
      </div>
      <div class="field">
        <label for="estado">Pago</label>
        <select id="estado" :value="filters.estado" @change="setFilter({ estado: ($event.target as HTMLSelectElement).value })">
          <option value="">Todos</option>
          <option v-for="(label, value) in ORDER_STATUS" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
      <div class="field">
        <label for="acceso">Acceso</label>
        <select id="acceso" :value="filters.acceso" @change="setFilter({ acceso: ($event.target as HTMLSelectElement).value })">
          <option value="">Todos</option>
          <option v-for="(label, value) in ORDER_ACCESS" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
    </div>

    <div v-if="error && !page" class="notice notice-warning" role="alert">
      No se pudieron cargar las ventas. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-if="page">
      <p class="count muted" aria-live="polite">
        {{ page.count }} {{ page.count === 1 ? 'orden' : 'órdenes' }}
      </p>

      <div v-if="page.results.length" class="table-wrap" :class="{ loading }" :aria-busy="loading">
        <table>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Comprador</th>
              <th scope="col">Curso</th>
              <th scope="col" class="num">Monto</th>
              <th scope="col">Pago</th>
              <th scope="col">Acceso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in page.results" :key="order.id">
              <td class="date">{{ formatDateTime(dateOf(order)) }}</td>
              <td>
                <span class="who">{{ order.username }}</span>
                <span class="muted small">{{ order.email }}</span>
              </td>
              <td class="course">{{ order.course_title }}</td>
              <td class="num">{{ money(order.amount) }}</td>
              <td><span class="pill" :class="`pay-${order.status}`">{{ ORDER_STATUS[order.status] }}</span></td>
              <td class="access">
                <span class="pill" :class="`access-${order.access}`">
                  <span v-if="order.access === 'error'" aria-hidden="true">!</span>
                  {{ ORDER_ACCESS[order.access] }}
                </span>
                <template v-if="order.access === 'error'">
                  <button type="button" class="link-button" :disabled="retrying === order.id" @click="retry(order)">
                    {{ retrying === order.id ? 'Reintentando…' : 'Reintentar' }}
                  </button>
                  <p class="muted small error-text" :title="order.access_error">{{ order.access_error }}</p>
                </template>
                <p v-if="retryMessage?.id === order.id" class="small" :class="`msg-${retryMessage.kind}`" role="status">
                  {{ retryMessage.text }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty muted">No hay órdenes con estos filtros.</p>

      <nav v-if="pages > 1" class="pager" aria-label="Páginas">
        <button type="button" class="btn btn-secondary" :disabled="filters.pagina <= 1"
                @click="setFilter({ pagina: filters.pagina - 1 })">Anterior</button>
        <span class="muted">Página {{ filters.pagina }} de {{ pages }}</span>
        <button type="button" class="btn btn-secondary" :disabled="filters.pagina >= pages"
                @click="setFilter({ pagina: filters.pagina + 1 })">Siguiente</button>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

h1 {
  margin: 0 0 4px;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  letter-spacing: -0.03em;
}

.page-header p {
  margin: 0;
}

.filters {
  display: grid;
  gap: 12px 16px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 16px;
}

.filters .field:first-child {
  grid-column: 1 / -1;
}

@media (min-width: 768px) {
  .filters {
    grid-template-columns: minmax(0, 320px) 200px 200px;
  }

  .filters .field:first-child {
    grid-column: auto;
  }
}

.filters label {
  font-size: 0.88rem;
}

.filters input,
select {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.92rem;
}

.count {
  margin: 0 0 10px;
  font-size: 0.9rem;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
  transition: opacity 0.2s;
}

.table-wrap.loading {
  opacity: 0.55;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  vertical-align: top;
}

tbody tr:last-child > td {
  border-bottom: 0;
}

thead th {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.who {
  display: block;
  font-weight: 500;
}

.course {
  min-width: 160px;
}

.num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.small {
  font-size: 0.8rem;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  background: var(--ui-color-neutral-100);
  color: var(--ui-color-neutral-700);
}

.pay-paid,
.access-granted {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.pay-refunded,
.access-revoked {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}

.access-error {
  background: var(--ui-color-error-50);
  color: var(--ui-color-error-800);
}

.access {
  min-width: 170px;
}

.access .link-button {
  margin-left: 8px;
}

.error-text {
  max-width: 260px;
  margin: 4px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.msg-success {
  margin: 4px 0 0;
  color: var(--ui-color-success-700);
}

.msg-warning {
  margin: 4px 0 0;
  color: var(--ui-color-error-700);
}

.empty {
  padding: 32px;
  text-align: center;
  border: 1px dashed var(--ui-border-accented);
  border-radius: var(--brand-radius);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.pager .btn {
  padding: 8px 18px;
}

.pager .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.link-button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ui-primary);
  text-decoration: underline;
  cursor: pointer;
}

.link-button:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
