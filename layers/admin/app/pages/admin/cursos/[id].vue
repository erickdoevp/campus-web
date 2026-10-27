<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const config = useRuntimeConfig()
const toast = useToast()
const id = Number(route.params.id)

const { data: product, error, refresh } = await useFetch<Product>(`/api/admin/products/${id}`, { key: `admin-product-${id}` })
if (error.value?.statusCode === 404 || (!product.value && !error.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado', fatal: true })
}
useSeoMeta({ title: () => `${product.value?.title ?? 'Curso'} · Administración`, robots: 'noindex' })

const courseKey = computed(() => product.value?.course_key ?? null)

// The outline lives in Open edX, which is slow on big courses: show the page and fill it in.
// Loads again by itself once the course is created in Open edX (the URL changes).
const { data: outline, error: outlineError, refresh: refreshOutline } = useFetch<CourseOutline>(
  () => contentApi(courseKey.value ?? ''),
  { key: `admin-outline-${id}`, server: false, immediate: !!courseKey.value },
)

const tabs = [
  { value: 'contenido', label: 'Contenido' },
  { value: 'informacion', label: 'Información' },
  { value: 'venta', label: 'Precio y venta' },
] as const
type Tab = typeof tabs[number]['value']
// Content needs the course in Open edX; until then the page opens on the sale status.
const tab = computed<Tab>({
  get: () => {
    const asked = tabs.find(t => t.value === route.query.tab)?.value
    if (asked && (asked !== 'contenido' || courseKey.value)) return asked
    return courseKey.value ? 'contenido' : 'venta'
  },
  set: value => navigateTo({ query: { ...route.query, tab: value === 'contenido' ? undefined : value } }, { replace: true }),
})

function saved(updated: Product) {
  product.value = updated
}

const publishing = ref(false)
async function publish() {
  if (!courseKey.value) return
  publishing.value = true
  try {
    outline.value = await $fetch<CourseOutline>(contentApi(courseKey.value, '/publish'), { method: 'POST' })
    toast.add({ title: 'Cambios publicados', description: 'Los alumnos ya ven el contenido actualizado.', color: 'success' })
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo publicar.'), color: 'error' })
  }
  finally {
    publishing.value = false
  }
}

const studioCourseUrl = computed(() => courseKey.value && `${config.public.studioUrl}/course/${courseKey.value}`)
const publicUrl = computed(() => (product.value?.status === 'on_sale' && courseKey.value ? coursePath(courseKey.value) : null))
</script>

<template>
  <div class="section container">
    <NuxtLink to="/admin/cursos" class="back-link rise">← Cursos</NuxtLink>

    <div v-if="error || !product" class="notice notice-error" role="alert">
      No pudimos cargar el curso. {{ cmsErrors(error).general }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <header class="admin-header course-header rise" style="--i: 1">
        <div class="course-heading">
          <p class="eyebrow">{{ product.org }} / {{ product.number }} / {{ product.run }}</p>
          <h1>{{ product.title }}</h1>
          <div class="status">
            <ProductStatusBadge :status="product.status" />
            <template v-if="outline">
              <span v-if="outline.hasUnpublishedChanges" class="badge badge-warning">Cambios sin publicar</span>
              <span v-else-if="outline.modules.length" class="badge badge-success">Contenido publicado</span>
            </template>
            <span v-if="product.price != null && Number(product.price) > 0" class="badge">{{ formatPrice(Number(product.price), product.currency) }}</span>
            <span v-else class="badge badge-muted">Sin precio</span>
          </div>
        </div>
        <div class="course-actions">
          <button v-if="courseKey" type="button" class="btn btn-primary" :disabled="publishing || !outline?.hasUnpublishedChanges" @click="publish">
            {{ publishing ? 'Publicando…' : 'Publicar cambios' }}
          </button>
          <NuxtLink v-if="publicUrl" :to="publicUrl" class="btn btn-secondary" target="_blank">Ver en Campus</NuxtLink>
          <a v-if="studioCourseUrl" :href="studioCourseUrl" class="btn btn-secondary" target="_blank" rel="noopener">Abrir en Studio</a>
        </div>
      </header>

      <div v-if="!courseKey" class="notice notice-warning rise" style="--i: 2" role="status">
        Este curso todavía no existe en Open edX. Créalo en <strong>Precio y venta</strong> para armar su temario.
      </div>
      <div v-else-if="outline?.hasUnpublishedChanges" class="notice notice-info rise" style="--i: 2" role="status">
        Los módulos, lecciones, videos y evaluaciones nuevos o modificados no aparecen a los alumnos hasta que pulses <strong>Publicar cambios</strong>.
      </div>

      <div class="tabs rise" style="--i: 2" role="tablist" aria-label="Secciones del curso">
        <button
          v-for="t in tabs"
          :id="`tab-${t.value}`"
          :key="t.value"
          type="button"
          role="tab"
          class="chip"
          :aria-selected="tab === t.value"
          :aria-controls="`panel-${t.value}`"
          :disabled="t.value === 'contenido' && !courseKey"
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" class="rise" style="--i: 3">
        <template v-if="tab === 'contenido' && courseKey">
          <div v-if="outlineError" class="notice notice-error" role="alert">
            {{ apiErrorMessage(outlineError, 'No pudimos cargar el contenido desde Open edX.') }}
            <button type="button" class="link-button" @click="refreshOutline()">Reintentar</button>
          </div>
          <AdminCourseContent v-else-if="outline" :course-key="courseKey" :outline="outline" @changed="refreshOutline()" />
          <p v-else class="muted">Cargando el temario desde Open edX…</p>
        </template>
        <AdminCourseInfo v-else-if="tab === 'informacion'" :product="product" @saved="saved" />
        <AdminCourseSale v-else :product="product" @saved="saved" />
      </div>
    </template>
  </div>
</template>

<style scoped>
.back-link {
  margin-bottom: 20px;
}

.course-header {
  align-items: flex-start;
}

.course-heading {
  flex: 1 1 420px;
  min-width: 0;
}

.course-heading h1 {
  max-width: 24ch;
  overflow-wrap: break-word;
}

.status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.course-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ui-border);
}

.chip {
  padding: 9px 16px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}

.chip:hover:not(:disabled) {
  border-color: var(--ui-text-highlighted);
}

.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.chip[aria-selected='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.notice {
  margin-bottom: 20px;
}
</style>
