<script setup lang="ts">
/**
 * Price and sale status, kept in the CMS: a course goes from draft (only in
 * the CMS) to created (in Open edX) to on sale, and can be withdrawn or
 * archived. The CMS checks every step again.
 */
const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ saved: [product: Product] }>()
const toast = useToast()

const price = ref<number | ''>(props.product.price != null ? Number(props.product.price) : '')
watch(() => props.product.price, (value) => { price.value = value != null ? Number(value) : '' })

const invalidPrice = computed(() => typeof price.value === 'number' && price.value < 0)
const priceChanged = computed(() => (price.value === '' ? null : Number(price.value)) !== (props.product.price != null ? Number(props.product.price) : null))
const savingPrice = ref(false)
const priceError = ref('')

async function savePrice() {
  priceError.value = ''
  if (invalidPrice.value) {
    document.getElementById('sale-price')?.focus()
    return
  }
  savingPrice.value = true
  try {
    const body = { price: price.value === '' ? null : String(price.value) } satisfies ProductInput
    emit('saved', await $fetch<Product>(`/api/admin/products/${props.product.id}`, { method: 'PATCH', body }))
    toast.add({ title: 'Precio guardado', color: 'success' })
  }
  catch (e) {
    const problem = cmsErrors(e)
    priceError.value = problem.fields.price || problem.general || 'No se pudo guardar.'
  }
  finally {
    savingPrice.value = false
  }
}

// --- sale status ---------------------------------------------------------------

type Action = 'create-course' | 'put-on-sale' | 'withdraw' | 'archive' | 'delete'
const running = ref<Action | null>(null)
// Irreversible actions ask for a second click.
const confirming = ref<Action | null>(null)
const actionError = ref('')

const SUCCESS: Record<Exclude<Action, 'delete'>, string> = {
  'create-course': 'El curso ya existe en Open edX. Arma su temario en la pestaña Contenido.',
  'put-on-sale': 'El curso está a la venta en Campus.',
  'withdraw': 'El curso ya no está a la venta.',
  'archive': 'Curso archivado.',
}

async function run(action: Action) {
  running.value = action
  actionError.value = ''
  try {
    if (action === 'delete') {
      await $fetch(`/api/admin/products/${props.product.id}`, { method: 'DELETE' })
      toast.add({ title: `Se borró el borrador “${props.product.title}”`, color: 'success' })
      await navigateTo('/admin/cursos')
      return
    }
    emit('saved', await $fetch<Product>(`/api/admin/products/${props.product.id}/${action}`, { method: 'POST' }))
    toast.add({ title: SUCCESS[action], color: 'success' })
  }
  catch (e) {
    actionError.value = cmsErrors(e).general || 'No se pudo completar. Intenta de nuevo.'
  }
  finally {
    running.value = null
    confirming.value = null
  }
}

const p = computed(() => props.product)
// A draft with a course key: the creation in Open edX stopped half way.
const halfCreated = computed(() => p.value.status === 'draft' && !!p.value.course_key)
const requirements = computed(() => {
  if (p.value.status === 'draft') {
    return [
      { label: 'Fecha de inicio', ok: !!p.value.start },
      { label: 'Al menos un autor', ok: p.value.authors.length > 0 },
    ]
  }
  if (p.value.status === 'created') {
    return [
      { label: 'Precio', ok: !!p.value.price && Number(p.value.price) > 0 },
      { label: 'Portada (pestaña Información)', ok: !!p.value.image },
    ]
  }
  return []
})
const ready = computed(() => requirements.value.every(r => r.ok))
</script>

<template>
  <div>
    <form class="admin-panel" novalidate @submit.prevent="savePrice">
      <h2>Precio</h2>
      <p class="muted panel-intro">
        <template v-if="p.status === 'on_sale'">A la venta en Campus por <strong>{{ formatPrice(Number(p.price), p.currency) }}</strong>.</template>
        <template v-else-if="p.price && Number(p.price) > 0">Precio de {{ formatPrice(Number(p.price), p.currency) }}; todavía no está a la venta.</template>
        <template v-else>Sin precio todavía.</template>
        Pago único con Stripe.
      </p>

      <div v-if="priceError" class="notice notice-error" role="alert">{{ priceError }}</div>

      <div class="field price-field">
        <label for="sale-price">Precio ({{ p.currency.toUpperCase() }})</label>
        <div class="input-prefix">
          <span aria-hidden="true">$</span>
          <input id="sale-price" v-model.number="price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Sin precio" :aria-invalid="invalidPrice">
        </div>
        <p class="field-hint">Puede llevar centavos. Para quitarlo, primero retira el curso de la venta; quien ya lo compró conserva el acceso.</p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="savingPrice || !priceChanged">{{ savingPrice ? 'Guardando…' : 'Guardar precio' }}</button>
      </div>
    </form>

    <section class="admin-panel">
      <div class="status-head">
        <h2>Estado</h2>
        <ProductStatusBadge :status="p.status" />
      </div>
      <p class="muted panel-intro">{{ PRODUCT_STATUS[p.status].hint }}</p>

      <div v-if="halfCreated" class="notice notice-warning">
        La creación en Open edX quedó a medias. Reintenta para terminarla; no se duplica el curso.
      </div>

      <ul v-if="requirements.length" class="requirements">
        <li v-for="req in requirements" :key="req.label" :class="{ ok: req.ok }">
          <span class="mark" aria-hidden="true">{{ req.ok ? '✓' : '○' }}</span>
          {{ req.label }}<span class="visually-hidden">{{ req.ok ? ': listo' : ': falta' }}</span>
        </li>
      </ul>

      <div v-if="actionError" class="notice notice-error" role="alert">{{ actionError }}</div>

      <div class="form-actions">
        <template v-if="p.status === 'draft'">
          <template v-if="confirming === 'create-course'">
            <p class="confirm-text">Se creará el curso en Open edX con este número y edición. No se pueden cambiar después.</p>
            <button type="button" class="btn btn-primary" :disabled="!!running" @click="run('create-course')">
              {{ running ? 'Creando…' : 'Sí, crear en Open edX' }}
            </button>
            <button type="button" class="btn btn-secondary" :disabled="!!running" @click="confirming = null">Cancelar</button>
          </template>
          <button v-else type="button" class="btn btn-primary" :disabled="!ready || !!running"
                  @click="halfCreated ? run('create-course') : confirming = 'create-course'">
            {{ running === 'create-course' ? 'Creando…' : halfCreated ? 'Reintentar creación' : 'Crear en Open edX' }}
          </button>
        </template>

        <button v-if="p.status === 'created'" type="button" class="btn btn-primary" :disabled="!ready || !!running" @click="run('put-on-sale')">
          {{ running === 'put-on-sale' ? 'Publicando…' : 'Poner a la venta' }}
        </button>

        <button v-if="p.status === 'on_sale'" type="button" class="btn btn-secondary" :disabled="!!running" @click="run('withdraw')">
          {{ running === 'withdraw' ? 'Retirando…' : 'Retirar de la venta' }}
        </button>
      </div>
    </section>

    <section v-if="(p.status === 'draft' && !p.course_key) || p.status === 'created' || p.status === 'on_sale'" class="admin-panel danger-zone">
      <template v-if="p.status === 'draft'">
        <h2>Borrar borrador</h2>
        <p class="muted panel-intro">Solo existe en el CMS: se borra sin tocar Open edX.</p>
        <div v-if="confirming === 'delete'" class="form-actions">
          <button type="button" class="btn btn-delete" :disabled="!!running" @click="run('delete')">{{ running ? 'Borrando…' : 'Sí, borrar borrador' }}</button>
          <button type="button" class="btn btn-secondary" :disabled="!!running" @click="confirming = null">Cancelar</button>
        </div>
        <button v-else type="button" class="btn btn-danger" @click="confirming = 'delete'">Borrar borrador…</button>
      </template>
      <template v-else>
        <h2>Archivar curso</h2>
        <p class="muted panel-intro">
          Deja de venderse y no se puede volver a poner a la venta. Quienes lo compraron conservan el acceso, y el contenido sigue en Open edX.
        </p>
        <div v-if="confirming === 'archive'" class="form-actions">
          <button type="button" class="btn btn-delete" :disabled="!!running" @click="run('archive')">{{ running ? 'Archivando…' : 'Sí, archivar' }}</button>
          <button type="button" class="btn btn-secondary" :disabled="!!running" @click="confirming = null">Cancelar</button>
        </div>
        <button v-else type="button" class="btn btn-danger" @click="confirming = 'archive'">Archivar este curso…</button>
      </template>
    </section>
  </div>
</template>

<style scoped>
.price-field {
  max-width: 280px;
}

.status-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 4px;
}

.status-head h2 {
  margin: 0;
}

.notice {
  margin-bottom: 16px;
}

.requirements {
  display: grid;
  gap: 6px;
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  font-size: 0.95rem;
  color: var(--ui-text-muted);
}

.requirements .ok {
  color: var(--ui-text-highlighted);
}

.mark {
  display: inline-block;
  width: 1.2em;
  font-weight: 700;
}

.requirements .ok .mark {
  color: var(--ui-color-success-600);
}

.confirm-text {
  flex-basis: 100%;
  margin: 0;
  font-size: 0.92rem;
}

.danger-zone {
  border-color: var(--ui-color-error-200);
}

.danger-zone h2 {
  color: var(--ui-color-error-700);
}

.danger-zone .form-actions {
  margin-top: 0;
}

.btn-delete {
  background: var(--ui-color-error-600);
  color: var(--ui-text-inverted);
}

.btn-delete:not([disabled]):hover {
  background: var(--ui-color-error-700);
}
</style>
