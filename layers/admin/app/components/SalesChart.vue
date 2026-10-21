<script setup lang="ts">
/**
 * Net sales per day (or week) as columns: one series, so no legend; the title
 * says what it is. Hover or arrow keys show every figure of a column; the
 * table view has them all without hovering. Net can go below zero on a day
 * with more refunds than sales, so the baseline is the zero line.
 */
const props = defineProps<{ points: SalesPoint[], granularity: 'day' | 'week', from: string, to: string }>()

const HEIGHT = 220
const MARGIN = { top: 22, right: 8, bottom: 28, left: 52 }
const MAX_BAR = 24
const GAP = 2

const container = ref<HTMLElement>()
const width = ref(720)
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => { width.value = Math.max(280, entry!.contentRect.width) })
  observer.observe(container.value!)
})
onBeforeUnmount(() => observer?.disconnect())

const values = computed(() => props.points.map(p => Number(p.net)))
const empty = computed(() => props.points.every(p => !Number(p.gross) && !Number(p.refunds)))

/** Clean round ticks covering 0 and every value. */
const ticks = computed(() => {
  const max = Math.max(0, ...values.value)
  const min = Math.min(0, ...values.value)
  const span = max - min || 1000
  const rough = span / 4
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map(m => m * magnitude).find(s => s >= rough)!
  const result: number[] = []
  for (let i = Math.floor(min / step); i <= Math.ceil(max / step); i++) result.push(Math.round(i * step * 100) / 100)
  // All zeros (no sales): still draw a scale above the zero line.
  if (result.length < 2) result.push(result[0]! + step)
  return result
})

const plot = computed(() => ({
  x: MARGIN.left,
  y: MARGIN.top,
  w: width.value - MARGIN.left - MARGIN.right,
  h: HEIGHT - MARGIN.top - MARGIN.bottom,
}))
const yMin = computed(() => ticks.value[0]!)
const yMax = computed(() => ticks.value[ticks.value.length - 1]!)
const y = (value: number) => plot.value.y + plot.value.h * (1 - (value - yMin.value) / (yMax.value - yMin.value))

const band = computed(() => plot.value.w / Math.max(1, props.points.length))
const barWidth = computed(() => Math.max(2, Math.min(MAX_BAR, band.value - GAP)))

/** A column with a 4px rounded data end and a square end on the zero line. */
function barPath(index: number) {
  const value = values.value[index]!
  const x = plot.value.x + band.value * index + (band.value - barWidth.value) / 2
  const w = barWidth.value
  const base = y(0)
  const end = y(value)
  const h = Math.abs(base - end)
  if (h < 0.5) return ''
  const r = Math.min(4, w / 2, h)
  if (value > 0) {
    return `M${x},${base}V${end + r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + r}V${base}Z`
  }
  return `M${x},${base}V${end - r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end - r}V${base}Z`
}

// Only the best column gets a value on its cap; the axis and tooltip carry the rest.
const best = computed(() => {
  const max = Math.max(...values.value)
  return max > 0 ? values.value.indexOf(max) : -1
})

const labelEvery = computed(() => Math.ceil(props.points.length / Math.max(2, Math.floor(plot.value.w / 72))))
// The first and last weeks can stick out of the period: their column is short, not a drop.
const partial = (point: SalesPoint) =>
  props.granularity === 'week' && (point.date < props.from || addDays(point.date, 6) > props.to)
const bucketLabel = (point: SalesPoint, long = false) => {
  if (props.granularity === 'day') return shortDay(point.date, long)
  if (!long) return shortDay(point.date)
  return `Semana del ${shortDay(point.date, true)}${partial(point) ? ' (incompleta)' : ''}`
}

// --- hover / keyboard ---------------------------------------------------------

const active = ref<number | null>(null)
const activePoint = computed(() => (active.value == null ? null : props.points[active.value]))
// Beside the column, never over it: to its right in the left half, to its left otherwise.
const tooltipStyle = computed(() => {
  if (active.value == null) return {}
  const center = plot.value.x + band.value * (active.value + 0.5)
  const offset = barWidth.value / 2 + 10
  return center < width.value / 2
    ? { left: `${center + offset}px` }
    : { left: `${center - offset}px`, transform: 'translateX(-100%)' }
})

function onKey(event: KeyboardEvent) {
  const last = props.points.length - 1
  if (event.key === 'ArrowRight') active.value = Math.min(last, (active.value ?? -1) + 1)
  else if (event.key === 'ArrowLeft') active.value = Math.max(0, (active.value ?? last + 1) - 1)
  else if (event.key === 'Home') active.value = 0
  else if (event.key === 'End') active.value = last
  else if (event.key === 'Escape') active.value = null
  else return
  event.preventDefault()
}

const showTable = ref(false)
const summary = computed(() =>
  `Ventas netas por ${props.granularity === 'week' ? 'semana' : 'día'}, ${props.points.length} columnas. `
  + 'Usa las flechas para recorrerlas o abre la tabla.')
</script>

<template>
  <figure class="chart">
    <figcaption class="chart-header">
      <div>
        <h2>Ventas netas por {{ granularity === 'week' ? 'semana' : 'día' }}</h2>
        <p class="muted">Lo que entró menos lo que se reembolsó.</p>
      </div>
      <button type="button" class="link-button" :aria-pressed="showTable" @click="showTable = !showTable">
        {{ showTable ? 'Ver gráfica' : 'Ver tabla' }}
      </button>
    </figcaption>

    <div v-show="!showTable" ref="container" class="plot">
      <svg
        :width="width"
        :height="HEIGHT"
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        role="img"
        :aria-label="summary"
        tabindex="0"
        @keydown="onKey"
        @blur="active = null"
        @pointerleave="active = null"
      >
        <!-- recessive grid: hairlines one step off the surface -->
        <g class="grid">
          <template v-for="tick in ticks" :key="tick">
            <line :x1="plot.x" :x2="plot.x + plot.w" :y1="y(tick)" :y2="y(tick)" :class="{ zero: tick === 0 }" />
            <text :x="plot.x - 8" :y="y(tick)" dy="0.32em" text-anchor="end">{{ compactMoney(tick) }}</text>
          </template>
        </g>

        <g class="bars">
          <path
            v-for="(point, i) in points"
            :key="point.date"
            :d="barPath(i)"
            :class="{ active: active === i, dimmed: active !== null && active !== i }"
          />
        </g>

        <text
          v-if="best >= 0"
          class="cap-label"
          :x="plot.x + band * (best + 0.5)"
          :y="y(values[best]!) - 6"
          text-anchor="middle"
        >
          {{ compactMoney(values[best]!) }}
        </text>

        <g class="x-axis">
          <template v-for="(point, i) in points" :key="point.date">
            <text v-if="i % labelEvery === 0" :x="plot.x + band * (i + 0.5)" :y="HEIGHT - 8" text-anchor="middle">
              {{ bucketLabel(point) }}
            </text>
          </template>
        </g>

        <!-- hit targets: the whole column band, bigger than the bar -->
        <g>
          <rect
            v-for="(point, i) in points"
            :key="point.date"
            class="hit"
            :x="plot.x + band * i"
            :y="plot.y"
            :width="band"
            :height="plot.h"
            @pointerenter="active = i"
          />
        </g>
      </svg>

      <p v-if="empty" class="empty muted">Sin ventas en este periodo.</p>

      <div v-if="activePoint" class="tooltip" :style="tooltipStyle" role="status">
        <p class="tooltip-title">{{ bucketLabel(activePoint, true) }}</p>
        <p class="tooltip-main"><strong>{{ money(activePoint.net) }}</strong> neto</p>
        <dl>
          <div><dt>Entró</dt><dd>{{ money(activePoint.gross) }}</dd></div>
          <div><dt>Reembolsos</dt><dd>{{ money(activePoint.refunds) }}</dd></div>
          <div><dt>Ventas</dt><dd>{{ activePoint.paid_orders }}</dd></div>
        </dl>
      </div>
    </div>

    <div v-if="showTable" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ granularity === 'week' ? 'Semana del' : 'Día' }}</th>
            <th scope="col" class="num">Ventas</th>
            <th scope="col" class="num">Entró</th>
            <th scope="col" class="num">Reembolsos</th>
            <th scope="col" class="num">Neto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in points" :key="point.date">
            <th scope="row">{{ shortDay(point.date, true) }}<span v-if="partial(point)" class="muted"> (incompleta)</span></th>
            <td class="num">{{ point.paid_orders }}</td>
            <td class="num">{{ money(point.gross) }}</td>
            <td class="num">{{ money(point.refunds) }}</td>
            <td class="num">{{ money(point.net) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<style scoped>
.chart {
  margin: 0;
  padding: 20px 20px 12px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
}

.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

h2 {
  margin: 0 0 2px;
  font-size: 1.05rem;
}

.chart-header p {
  margin: 0;
  font-size: 0.85rem;
}

.plot {
  position: relative;
}

svg {
  display: block;
  width: 100%;
  overflow: visible;
}

svg:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 4px;
  border-radius: 4px;
}

.grid line {
  stroke: var(--ui-border);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.grid line.zero {
  stroke: var(--ui-border-accented);
}

.grid text,
.x-axis text {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  fill: var(--ui-text-muted);
}

.bars path {
  fill: var(--ui-primary);
  transition: opacity 0.15s, fill 0.15s;
}

.bars path.active {
  fill: var(--ui-color-primary-700);
}

.bars path.dimmed {
  opacity: 0.55;
}

.cap-label {
  font-size: 11px;
  font-weight: 600;
  fill: var(--ui-text-highlighted);
}

.hit {
  fill: transparent;
}

.empty {
  position: absolute;
  inset: 0 0 28px 52px;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: 0.92rem;
  pointer-events: none;
}

.tooltip {
  position: absolute;
  top: 0;
  min-width: 170px;
  padding: 10px 12px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
  box-shadow: var(--brand-shadow);
  font-size: 0.82rem;
  pointer-events: none;
}

.tooltip p {
  margin: 0;
}

.tooltip-title {
  color: var(--ui-text-muted);
}

.tooltip-main {
  margin: 2px 0 6px !important;
  font-size: 0.95rem;
}

.tooltip-main strong {
  font-size: 1.05rem;
}

.tooltip dl {
  display: grid;
  gap: 2px;
  margin: 0;
}

.tooltip dl div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.tooltip dt {
  color: var(--ui-text-muted);
}

.tooltip dd {
  margin: 0;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.table-wrap {
  max-height: 360px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

th,
td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--ui-border);
  text-align: left;
  white-space: nowrap;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--ui-bg);
  font-weight: 600;
  color: var(--ui-text-muted);
}

tbody th {
  font-weight: 500;
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.link-button {
  flex-shrink: 0;
  padding: 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-primary);
  text-decoration: underline;
  cursor: pointer;
}
</style>
