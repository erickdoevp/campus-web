<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Resumen · Administración', robots: 'noindex' })

const route = useRoute()
const router = useRouter()

// The period lives in the URL (?desde=&hasta=), so a view can be shared or reloaded.
const DAY = /^\d{4}-\d{2}-\d{2}$/
const range = computed({
  get() {
    const to = String(route.query.hasta ?? '')
    const from = String(route.query.desde ?? '')
    if (DAY.test(from) && DAY.test(to) && from <= to) return { from, to }
    const today = todayInMexico()
    return { from: addDays(today, -29), to: today }
  },
  set(value) {
    router.replace({ query: { ...route.query, desde: value.from, hasta: value.to } })
  },
})

const { data, status, error, refresh } = await useFetch<SalesStats>('/api/admin/stats', {
  query: computed(() => range.value),
})
// While a new period loads, keep showing the last one (dimmed) instead of flashing.
const stats = ref(data.value)
watch(data, (value) => { if (value) stats.value = value })
const loading = computed(() => status.value === 'pending' && !!stats.value)

const t = computed(() => stats.value!.totals)
const p = computed(() => stats.value!.previous)
const periodText = computed(() => {
  const s = stats.value!
  return `${shortDay(s.from, true)} – ${shortDay(s.to, true)}`
})
</script>

<template>
  <div class="section container">
    <header class="page-header">
      <div>
        <h1>Resumen</h1>
        <p v-if="stats" class="muted">{{ periodText }} · hora del centro de México</p>
      </div>
    </header>

    <DateRangeFilter v-model="range" class="filters" />

    <div v-if="error && !stats" class="notice notice-warning" role="alert">
      No se pudieron cargar las cifras. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <div v-if="stats" class="content" :class="{ loading }" :aria-busy="loading">
      <div v-if="stats.attention.access_errors" class="alert alert-critical" role="alert">
        <span class="alert-icon" aria-hidden="true">!</span>
        <p>
          <strong>{{ stats.attention.access_errors }} {{ stats.attention.access_errors === 1 ? 'compra pagada no tiene' : 'compras pagadas no tienen' }} acceso al curso</strong>
          porque Open edX no respondió. Se reintenta solo cada día; puedes reintentarlo ahora.
        </p>
        <NuxtLink :to="{ path: '/admin/ventas', query: { acceso: 'error' } }" class="btn btn-secondary">Ver y reintentar</NuxtLink>
      </div>

      <section class="kpis" aria-label="Cifras del periodo">
        <StatTile
          class="kpi-hero"
          hero
          label="Ventas netas"
          :value="money(t.net)"
          :change="percentChange(t.net, p.net)"
          hint="Lo que entró menos los reembolsos del periodo."
        />
        <StatTile label="Entró" :value="money(t.gross)" :change="percentChange(t.gross, p.gross)" />
        <StatTile
          label="Reembolsos"
          :value="money(t.refunds)"
          :change="percentChange(t.refunds, p.refunds)"
          :up-is-good="false"
          :hint="`${t.refunded_orders} ${t.refunded_orders === 1 ? 'orden' : 'órdenes'}`"
        />
        <StatTile
          label="Ventas"
          :value="String(t.paid_orders)"
          :change="percentChange(t.paid_orders, p.paid_orders)"
          :hint="`${t.buyers} ${t.buyers === 1 ? 'comprador' : 'compradores'}`"
        />
        <StatTile label="Ticket promedio" :value="money(t.average_order)" />
      </section>

      <SalesChart :points="stats.series" :granularity="stats.granularity" :from="stats.from" :to="stats.to" />

      <section class="courses">
        <div class="section-title">
          <h2>Por curso</h2>
          <p v-if="stats.attention.pending" class="muted">
            <NuxtLink :to="{ path: '/admin/ventas', query: { estado: 'pending' } }">
              {{ stats.attention.pending }} {{ stats.attention.pending === 1 ? 'orden pendiente' : 'órdenes pendientes' }} de pago
            </NuxtLink>
            (OXXO sin pagar o checkouts abiertos)
          </p>
        </div>

        <div v-if="stats.courses.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Curso</th>
                <th scope="col">Estado</th>
                <th scope="col" class="num">Ventas</th>
                <th scope="col" class="num">Entró</th>
                <th scope="col" class="num">Reembolsos</th>
                <th scope="col" class="num">Neto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="course in stats.courses" :key="course.product_id">
                <th scope="row">
                  <NuxtLink :to="`/admin/cursos/${course.product_id}`">{{ course.title }}</NuxtLink>
                </th>
                <td><ProductStatusBadge :status="course.status" /></td>
                <td class="num">{{ course.sold }}</td>
                <td class="num">{{ money(course.gross) }}</td>
                <td class="num">
                  {{ money(course.refunds) }}
                  <span v-if="course.refunded" class="muted small">({{ course.refunded }})</span>
                </td>
                <td class="num strong">{{ money(course.net) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty muted">Aún no hay cursos a la venta ni ventas en este periodo.</p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 16px;
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
  margin-bottom: 24px;
}

.content {
  display: grid;
  /* minmax(0, …): the chart measures its width from here, so it must not push it. */
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
  transition: opacity 0.2s;
}

.content.loading {
  opacity: 0.55;
}

.kpis {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kpi-hero {
  grid-column: 1 / -1;
}

@media (min-width: 900px) {
  .kpis {
    grid-template-columns: 1.6fr repeat(4, minmax(0, 1fr));
  }

  .kpi-hero {
    grid-column: auto;
  }
}

.alert {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 14px 18px;
  border-radius: var(--brand-radius-sm);
}

.alert p {
  flex: 1 1 220px;
  min-width: 0;
  margin: 0;
}

.alert-critical {
  border: 1px solid color-mix(in srgb, var(--ui-color-error-500) 35%, transparent);
  background: var(--ui-color-error-50);
  color: var(--ui-color-error-800);
}

.alert-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--ui-color-error-600);
  color: var(--ui-text-inverted);
  font-weight: 700;
}

.alert .btn {
  padding: 8px 16px;
}

.section-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.section-title h2 {
  margin: 0;
  font-size: 1.15rem;
}

.section-title p {
  margin: 0;
  font-size: 0.88rem;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}

th,
td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  white-space: nowrap;
}

tbody tr:last-child > * {
  border-bottom: 0;
}

thead th {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ui-text-muted);
}

tbody th {
  font-weight: 500;
}

tbody th a {
  color: var(--ui-text-highlighted);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.strong {
  font-weight: 650;
}

.small {
  font-size: 0.8rem;
}

.empty {
  padding: 32px;
  text-align: center;
  border: 1px dashed var(--ui-border-accented);
  border-radius: var(--brand-radius);
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
