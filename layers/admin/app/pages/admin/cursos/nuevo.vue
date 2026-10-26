<script setup lang="ts">
/**
 * New course, straight into Open edX: either a brand-new one, or an existing
 * Open edX course taken into the CMS (its content stays as it is). The CMS
 * saves the product and creates or adopts the course; then the content
 * editor opens.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Nuevo curso · Administración', robots: 'noindex' })

const toast = useToast()
const me = useCmsMe()
const org = computed(() => me.value?.course_org ?? '')

const mode = ref<'new' | 'take'>('new')
const modes = [
  { value: 'new', label: 'Crear un curso nuevo' },
  { value: 'take', label: 'Tomar un curso de Open edX' },
] as const

const form = reactive({
  name: '',
  number: '',
  run: String(new Date().getFullYear()),
  pacing: 'self' as 'self' | 'instructor',
  start: todayInMexico(),
  price: null as number | '' | null,
  // The creator authors the course: Studio lets them edit its content.
  authors: me.value?.username ?? '',
})

// The number follows the name until the user edits it.
const numberEdited = ref(false)
watch(() => form.name, (name) => {
  if (mode.value === 'new' && !numberEdited.value) form.number = courseNumberFrom(name)
})

const KEY_PART = /^[A-Za-z0-9_.-]+$/
const invalid = computed(() => ({
  take: mode.value === 'take' && !selected.value,
  name: !form.name.trim(),
  number: !KEY_PART.test(form.number.trim()),
  run: !KEY_PART.test(form.run.trim()),
  start: !form.start,
  // v-model.number leaves '' in an emptied field.
  price: typeof form.price === 'number' && form.price < 0,
  authors: !form.authors.trim(),
}))
const courseKey = computed(() => `course-v1:${org.value || 'ORG'}+${form.number.trim() || 'NUMERO'}+${form.run.trim() || 'EDICION'}`)

// --- take an existing course -------------------------------------------------------

const { data: studioCourses, error: studioError, status: studioStatus, execute: loadStudioCourses } = useFetch<StudioCourse[]>(
  '/api/admin/studio/courses',
  { server: false, immediate: false, default: () => [] },
)
const { data: products } = useFetch<Product[]>('/api/admin/products', { server: false, default: () => [] })
const takenKeys = computed(() => new Set(products.value.map(p => p.course_key ?? `course-v1:${p.org}+${p.number}+${p.run}`)))
// The CMS adopts a course only if its key has the CMS organization.
const takeable = computed(() => studioCourses.value.filter(c => c.org === org.value && !takenKeys.value.has(c.id)))
const otherOrgs = computed(() => studioCourses.value.filter(c => c.org !== org.value).length)

watch(mode, (value) => {
  if (value === 'take' && studioStatus.value === 'idle') loadStudioCourses()
})

const selected = ref('')
// The taken course's details the form doesn't show, kept as Open edX has them.
const taken = ref<{ start: string | null, end: string | null, shortDescription: string }>({ start: null, end: null, shortDescription: '' })
const loadingCourse = ref(false)
const selectError = ref('')

async function selectCourse(id: string) {
  selected.value = id
  selectError.value = ''
  if (!id) return
  loadingCourse.value = true
  try {
    const details = await $fetch<StudioCourseDetails>(`/api/admin/studio/courses/${encodeURIComponent(id)}`)
    const listed = studioCourses.value.find(c => c.id === id)!
    taken.value = { start: details.start, end: details.end, shortDescription: details.shortDescription }
    Object.assign(form, {
      name: listed.name,
      number: listed.number,
      run: listed.run,
      pacing: details.pacing,
      start: details.start ? toDateInput(details.start) : todayInMexico(),
    })
  }
  catch (e) {
    selectError.value = apiErrorMessage(e, 'No pudimos leer ese curso de Open edX.')
  }
  finally {
    loadingCourse.value = false
  }
}

/** The start as ISO; the taken course's exact one (with its time) when the day wasn't changed. */
function startValue() {
  if (mode.value === 'take' && taken.value.start && toDateInput(taken.value.start) === form.start) return taken.value.start
  return fromDateInput(form.start)
}

// --- create --------------------------------------------------------------------------

const submitted = ref(false)
const saving = ref(false)
const errors = ref<CmsErrors>()
const fieldError = (name: string) => errors.value?.fields[name]

async function create() {
  submitted.value = true
  errors.value = undefined
  const firstInvalid = Object.entries(invalid.value).find(([, bad]) => bad)?.[0]
  if (firstInvalid) {
    document.getElementById(`course-${firstInvalid}`)?.focus()
    return
  }
  saving.value = true
  let product: Product
  try {
    product = await $fetch<Product>('/api/admin/products', {
      method: 'POST',
      body: {
        title: form.name.trim(),
        number: form.number.trim(),
        run: form.run.trim(),
        pacing: form.pacing,
        start: startValue(),
        // The CMS writes its dates back to Open edX: keep the taken course's end.
        end: mode.value === 'take' ? taken.value.end : null,
        short_description: mode.value === 'take' ? taken.value.shortDescription : '',
        price: typeof form.price === 'number' && form.price > 0 ? String(form.price) : null,
        authors: form.authors.split(/[\s,]+/).filter(Boolean),
      } satisfies ProductInput,
    })
  }
  catch (e) {
    errors.value = cmsErrors(e)
    saving.value = false
    return
  }
  // The product exists now; a failure in Open edX is retried from its page.
  try {
    await $fetch(`/api/admin/products/${product.id}/create-course`, { method: 'POST' })
  }
  catch (e) {
    toast.add({
      title: 'Open edX no creó el curso',
      description: `${cmsErrors(e).general || 'Se guardó como borrador.'} Reintenta desde la página del curso.`,
      color: 'warning',
    })
    await navigateTo(`/admin/cursos/${product.id}`)
    return
  }
  toast.add(mode.value === 'take'
    ? { title: 'Curso tomado', description: 'Su contenido sigue igual; ahora lo editas aquí.', color: 'success' }
    : { title: 'Curso creado', description: 'Ahora agrega sus módulos, lecciones, videos y evaluaciones.', color: 'success' })
  await navigateTo(`/admin/cursos/${product.id}`)
}
</script>

<template>
  <div class="section container narrow">
    <NuxtLink to="/admin/cursos" class="back-link rise">← Cursos</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <h1>Nuevo curso</h1>
        <p class="muted lead">Se crea en Open edX. Podrás cambiar el nombre, la descripción, la portada y el precio después; la clave del curso no.</p>
      </div>
    </header>

    <div class="tabs rise" style="--i: 2" role="radiogroup" aria-label="Origen del curso">
      <button
        v-for="m in modes"
        :key="m.value"
        type="button"
        role="radio"
        class="chip"
        :aria-checked="mode === m.value"
        @click="mode = m.value"
      >
        {{ m.label }}
      </button>
    </div>

    <form class="admin-panel rise" style="--i: 3" novalidate @submit.prevent="create">
      <div v-if="errors?.general" class="notice notice-error" role="alert">{{ errors.general }}</div>

      <template v-if="mode === 'take'">
        <div v-if="studioError" class="notice notice-error" role="alert">
          {{ apiErrorMessage(studioError, 'No pudimos leer los cursos de Open edX.') }}
          <button type="button" class="link-button" @click="loadStudioCourses()">Reintentar</button>
        </div>
        <p v-else-if="studioStatus !== 'success'" class="muted">Buscando tus cursos en Open edX…</p>
        <div v-else class="field">
          <label for="course-take">Curso de Open edX</label>
          <select
            id="course-take"
            :value="selected"
            :aria-invalid="submitted && invalid.take"
            :disabled="loadingCourse"
            @change="selectCourse(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ takeable.length ? 'Elige un curso' : 'No hay cursos para tomar' }}</option>
            <option v-for="course in takeable" :key="course.id" :value="course.id">{{ course.name }} · {{ course.number }} / {{ course.run }}</option>
          </select>
          <p v-if="selectError" class="field-hint error">{{ selectError }}</p>
          <p v-else class="field-hint">
            Cursos de la organización <strong>{{ org }}</strong> que puedes editar en Studio y que aún no están en Campus. Conservan su contenido y sus alumnos.
            <template v-if="otherOrgs"> Hay {{ otherOrgs }} de otras organizaciones que no se pueden tomar.</template>
          </p>
        </div>
      </template>

      <fieldset v-if="mode === 'new' || selected" class="fields" :disabled="loadingCourse">
        <div class="field">
          <label for="course-name">Nombre del curso</label>
          <input id="course-name" v-model="form.name" type="text" maxlength="255" placeholder="Excel avanzado para contadores"
                 :aria-invalid="submitted && invalid.name || !!fieldError('title')" required>
          <p v-if="fieldError('title')" class="field-hint error">{{ fieldError('title') }}</p>
        </div>

        <div class="field-row">
          <div class="field">
            <label for="course-org">Organización</label>
            <input id="course-org" :value="org" type="text" disabled>
          </div>
          <div class="field">
            <label for="course-number">Número</label>
            <input id="course-number" v-model="form.number" type="text" maxlength="64" placeholder="EXCEL-101" :disabled="mode === 'take'"
                   :aria-invalid="submitted && invalid.number || !!fieldError('number')" required @input="numberEdited = true">
          </div>
          <div class="field">
            <label for="course-run">Edición</label>
            <input id="course-run" v-model="form.run" type="text" maxlength="64" :disabled="mode === 'take'"
                   :aria-invalid="submitted && invalid.run || !!fieldError('run')" required>
          </div>
        </div>
        <p v-if="fieldError('number') || fieldError('run')" class="field-hint error">{{ fieldError('number') || fieldError('run') }}</p>
        <p v-else class="field-hint">
          Solo letras sin acentos, números, guiones, puntos y guiones bajos. Clave: <code>{{ courseKey }}</code>
        </p>

        <div class="field-row">
          <div class="field">
            <label for="course-pacing">Modalidad</label>
            <select id="course-pacing" v-model="form.pacing">
              <option value="self">A tu ritmo</option>
              <option value="instructor">Con fechas del instructor</option>
            </select>
          </div>
          <div class="field">
            <label for="course-start">Fecha de inicio</label>
            <input id="course-start" v-model="form.start" type="date" :aria-invalid="submitted && invalid.start || !!fieldError('start')" required>
            <p v-if="fieldError('start')" class="field-hint error">{{ fieldError('start') }}</p>
          </div>
        </div>

        <div class="field">
          <label for="course-price">Precio (MXN)</label>
          <div class="input-prefix">
            <span aria-hidden="true">$</span>
            <input id="course-price" v-model.number="form.price" type="number" min="0" step="0.01" inputmode="decimal" placeholder="1499"
                   :aria-invalid="submitted && invalid.price || !!fieldError('price')">
          </div>
          <p v-if="fieldError('price')" class="field-hint error">{{ fieldError('price') }}</p>
          <p v-else class="field-hint">Opcional por ahora. Se pone a la venta desde la página del curso, cuando tenga precio y portada.</p>
        </div>

        <div class="field">
          <label for="course-authors">Autores</label>
          <input id="course-authors" v-model="form.authors" type="text" placeholder="usuario1, usuario2" spellcheck="false" autocapitalize="none"
                 :aria-invalid="submitted && invalid.authors || !!fieldError('authors')" required>
          <p v-if="fieldError('authors')" class="field-hint error">{{ fieldError('authors') }}</p>
          <p v-else class="field-hint">
            Usuarios de Open edX, separados por coma. Pueden editar el contenido del curso (aquí o en Studio); déjate a ti para armar el temario.
          </p>
        </div>
      </fieldset>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving || loadingCourse">
          {{ saving ? (mode === 'take' ? 'Tomando…' : 'Creando…') : (mode === 'take' ? 'Tomar curso' : 'Crear curso') }}
        </button>
        <NuxtLink to="/admin/cursos" class="btn btn-secondary">Cancelar</NuxtLink>
        <p v-if="saving" class="muted saving-hint" role="status">Open edX tarda unos segundos en crear el curso.</p>
      </div>
    </form>
  </div>
</template>

<style scoped>
.narrow {
  max-width: 820px;
}

.back-link {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
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

.chip:hover {
  border-color: var(--ui-text-highlighted);
}

.chip[aria-checked='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.fields {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
}

* + .fields {
  margin-top: 20px;
}

.field-hint.error {
  color: var(--ui-color-error-600);
}

input:disabled {
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
}

.saving-hint {
  margin: 0;
  font-size: 0.9rem;
}

code {
  font-size: 0.85em;
  overflow-wrap: anywhere;
}
</style>
