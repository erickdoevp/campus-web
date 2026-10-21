<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const config = useRuntimeConfig()
const id = Number(route.params.id)

const { data: product, error: loadError } = await useFetch<Product>(`/api/admin/products/${id}`)
if (loadError.value?.statusCode === 404 || (!product.value && !loadError.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado', fatal: true })
}
useSeoMeta({ title: () => `${product.value?.title ?? 'Curso'} · Administración`, robots: 'noindex' })

const notice = ref<{ kind: 'success' | 'warning', text: string } | null>(
  route.query.nuevo === 'sin-imagen'
    ? { kind: 'warning', text: 'Borrador guardado, pero la imagen no se subió. Vuelve a elegirla abajo.' }
    : route.query.nuevo
      ? { kind: 'success', text: 'Borrador guardado.' }
      : null,
)

// --- edit ------------------------------------------------------------------

const saving = ref(false)
const formErrors = ref<CmsErrors>()

async function save(input: ProductInput, image: File | null) {
  saving.value = true
  formErrors.value = undefined
  notice.value = null
  try {
    if (Object.keys(input).length) {
      product.value = await $fetch<Product>(`/api/admin/products/${id}`, { method: 'PATCH', body: input })
    }
    if (image) {
      product.value = await uploadProductImage(id, image)
    }
    notice.value = { kind: 'success', text: 'Cambios guardados.' }
  }
  catch (error) {
    formErrors.value = cmsErrors(error)
  }
  finally {
    saving.value = false
  }
}

// --- lifecycle ---------------------------------------------------------------

type Action = 'create-course' | 'put-on-sale' | 'withdraw' | 'archive' | 'delete'
const running = ref<Action | null>(null)
// Irreversible actions ask for a second click.
const confirming = ref<Action | null>(null)
const actionError = ref('')

const SUCCESS: Record<Exclude<Action, 'delete'>, string> = {
  'create-course': 'El curso ya existe en Open edX. Los autores pueden armar el contenido en Studio.',
  'put-on-sale': 'El curso está a la venta en Campus.',
  'withdraw': 'El curso ya no está a la venta.',
  'archive': 'Curso archivado.',
}

async function run(action: Action) {
  running.value = action
  actionError.value = ''
  notice.value = null
  try {
    if (action === 'delete') {
      await $fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      await navigateTo('/admin/cursos')
      return
    }
    product.value = await $fetch<Product>(`/api/admin/products/${id}/${action}`, { method: 'POST' })
    notice.value = { kind: 'success', text: SUCCESS[action] }
  }
  catch (error) {
    actionError.value = cmsErrors(error).general || 'No se pudo completar. Intenta de nuevo.'
  }
  finally {
    running.value = null
    confirming.value = null
  }
}

const p = computed(() => product.value!)
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
      { label: 'Imagen', ok: !!p.value.image },
    ]
  }
  return []
})
const ready = computed(() => requirements.value.every(r => r.ok))

const studioUrl = computed(() => p.value.course_key && `${config.public.studioUrl}/course/${p.value.course_key}`)
const publicUrl = computed(() => p.value.status === 'on_sale' && p.value.course_key ? coursePath(p.value.course_key) : null)
</script>

<template>
  <div v-if="product" class="section container">
    <NuxtLink to="/admin/cursos" class="back-link">← Cursos</NuxtLink>

    <header class="page-header">
      <div class="heading">
        <h1>{{ p.title }}</h1>
        <div class="meta">
          <ProductStatusBadge :status="p.status" />
          <code v-if="p.course_key" class="key">{{ p.course_key }}</code>
        </div>
      </div>
      <div class="links">
        <a v-if="studioUrl" :href="studioUrl" class="btn btn-secondary" target="_blank" rel="noopener">Abrir en Studio</a>
        <NuxtLink v-if="publicUrl" :to="publicUrl" class="btn btn-secondary" target="_blank">Ver en Campus</NuxtLink>
      </div>
    </header>

    <div v-if="notice" class="notice" :class="`notice-${notice.kind}`" role="status">{{ notice.text }}</div>

    <div class="layout">
      <aside class="panel">
        <h2>Estado</h2>
        <p class="muted state-hint">{{ PRODUCT_STATUS[p.status].hint }}</p>

        <div v-if="halfCreated" class="notice notice-warning">
          La creación en Open edX quedó a medias. Reintenta para terminarla; no se duplica el curso.
        </div>

        <ul v-if="requirements.length" class="requirements">
          <li v-for="req in requirements" :key="req.label" :class="{ ok: req.ok }">
            <span class="mark" aria-hidden="true">{{ req.ok ? '✓' : '○' }}</span>
            {{ req.label }}<span class="visually-hidden">{{ req.ok ? ': listo' : ': falta' }}</span>
          </li>
        </ul>

        <p v-if="actionError" class="notice notice-warning" role="alert">{{ actionError }}</p>

        <div class="panel-actions">
          <!-- draft -->
          <template v-if="p.status === 'draft'">
            <template v-if="confirming === 'create-course'">
              <p class="confirm-text">Se creará el curso en Open edX con este código y periodo. No se pueden cambiar después.</p>
              <button type="button" class="btn btn-primary" :disabled="!!running" @click="run('create-course')">
                {{ running ? 'Creando…' : 'Sí, crear en Open edX' }}
              </button>
              <button type="button" class="btn btn-secondary" :disabled="!!running" @click="confirming = null">Cancelar</button>
            </template>
            <button v-else type="button" class="btn btn-primary" :disabled="!ready || !!running"
                    @click="halfCreated ? run('create-course') : confirming = 'create-course'">
              {{ running === 'create-course' ? 'Creando…' : halfCreated ? 'Reintentar creación' : 'Crear en Open edX' }}
            </button>

            <template v-if="!p.course_key">
              <template v-if="confirming === 'delete'">
                <button type="button" class="btn btn-danger" :disabled="!!running" @click="run('delete')">Sí, borrar borrador</button>
                <button type="button" class="btn btn-secondary" @click="confirming = null">Cancelar</button>
              </template>
              <button v-else-if="confirming !== 'create-course'" type="button" class="link-button danger"
                      @click="confirming = 'delete'">Borrar borrador</button>
            </template>
          </template>

          <!-- created -->
          <button v-if="p.status === 'created' && confirming !== 'archive'" type="button" class="btn btn-primary" :disabled="!ready || !!running"
                  @click="run('put-on-sale')">
            {{ running === 'put-on-sale' ? 'Publicando…' : 'Poner a la venta' }}
          </button>

          <!-- on sale -->
          <button v-if="p.status === 'on_sale' && confirming !== 'archive'" type="button" class="btn btn-secondary" :disabled="!!running"
                  @click="run('withdraw')">
            {{ running === 'withdraw' ? 'Retirando…' : 'Retirar de la venta' }}
          </button>

          <!-- created or on sale -->
          <template v-if="p.status === 'created' || p.status === 'on_sale'">
            <template v-if="confirming === 'archive'">
              <p class="confirm-text">Deja de venderse y no se puede volver a poner a la venta. Quienes lo compraron conservan el acceso.</p>
              <button type="button" class="btn btn-danger" :disabled="!!running" @click="run('archive')">
                {{ running ? 'Archivando…' : 'Sí, archivar' }}
              </button>
              <button type="button" class="btn btn-secondary" @click="confirming = null">Cancelar</button>
            </template>
            <button v-else type="button" class="link-button danger" @click="confirming = 'archive'">Archivar</button>
          </template>
        </div>
      </aside>

      <ProductForm class="form" :product="p" submit-label="Guardar cambios" :pending="saving" :errors="formErrors"
                   @submit="save" />
    </div>
  </div>

  <div v-else class="section container">
    <NuxtLink to="/admin/cursos" class="back-link">← Cursos</NuxtLink>
    <div class="notice notice-warning" role="alert">No se pudo cargar el curso. {{ cmsErrors(loadError).general }}</div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin: 20px 0 24px;
}

.heading {
  min-width: 0;
}

h1 {
  margin: 0 0 10px;
  font-size: clamp(1.7rem, 4vw, 2.3rem);
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.key {
  font-size: 0.85rem;
  color: var(--ui-text-muted);
  overflow-wrap: anywhere;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.links .btn {
  padding: 9px 18px;
}

.layout {
  display: grid;
  gap: 24px;
  align-items: start;
}

@media (min-width: 1000px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }

  .panel {
    position: sticky;
    top: 84px;
    order: 2;
  }
}

.form {
  min-width: 0;
}

.panel {
  padding: 22px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
}

.panel h2 {
  margin: 0 0 6px;
  font-size: 1.05rem;
}

.state-hint {
  margin: 0 0 16px;
  font-size: 0.92rem;
}

.panel .notice {
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.requirements {
  display: grid;
  gap: 6px;
  margin: 0 0 18px;
  padding: 0;
  list-style: none;
  font-size: 0.92rem;
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

.panel-actions {
  display: grid;
  gap: 10px;
}

.panel-actions .btn {
  width: 100%;
  padding: 10px 18px;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-danger {
  background: var(--ui-color-error-600);
  color: var(--ui-text-inverted);
}

.btn-danger:hover {
  background: var(--ui-color-error-700);
}

.confirm-text {
  margin: 0;
  font-size: 0.88rem;
}

.link-button {
  justify-self: center;
  padding: 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  text-decoration: underline;
  cursor: pointer;
}

.link-button.danger:hover {
  color: var(--ui-color-error-600);
}
</style>
