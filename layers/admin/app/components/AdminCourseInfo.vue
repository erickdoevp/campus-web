<script setup lang="ts">
/**
 * Name, descriptions, cover image, and (until the course exists in Open edX)
 * dates, pacing and authors. Saved in the CMS, which passes them on to Open edX.
 */
const props = defineProps<{ product: Product }>()
const emit = defineEmits<{ saved: [product: Product] }>()
const toast = useToast()
const config = useRuntimeConfig()

function fromProduct(product: Product) {
  return {
    title: product.title,
    short_description: product.short_description,
    description: product.description,
    pacing: product.pacing,
    start: toDateInput(product.start),
    end: toDateInput(product.end),
    authors: product.authors.join(', '),
  }
}
type Form = ReturnType<typeof fromProduct>
const form = reactive(fromProduct(props.product))
watch(() => props.product, product => Object.assign(form, fromProduct(product)))

// Once the course exists in Open edX, Studio owns these.
const locked = computed(() => !!props.product.course_key)
const studioSettingsUrl = computed(() => `${config.public.studioUrl}/settings/details/${props.product.course_key}`)

const invalid = computed(() => ({
  title: !form.title.trim(),
  end: !!form.end && !!form.start && form.end <= form.start,
}))
const submitted = ref(false)
const saving = ref(false)
const errors = ref<CmsErrors>()
const fieldError = (name: string) => errors.value?.fields[name]

const toInput: { [K in keyof Form]: (value: Form[K]) => unknown } = {
  title: v => v.trim(),
  short_description: v => v.trim(),
  description: v => v,
  pacing: v => v,
  start: v => fromDateInput(v),
  end: v => fromDateInput(v),
  authors: v => v.split(/[\s,]+/).filter(Boolean),
}

async function save() {
  submitted.value = true
  errors.value = undefined
  const firstInvalid = Object.entries(invalid.value).find(([, bad]) => bad)?.[0]
  if (firstInvalid) {
    document.getElementById(`info-${firstInvalid}`)?.focus()
    return
  }
  // Only what changed: the CMS refuses locked fields even when equal in another format.
  const initial = fromProduct(props.product)
  const body: Record<string, unknown> = {}
  for (const key of Object.keys(toInput) as (keyof Form)[]) {
    if (form[key] !== initial[key]) body[key] = (toInput[key] as (value: string) => unknown)(form[key])
  }
  if (!Object.keys(body).length) {
    toast.add({ title: 'No hay cambios que guardar', color: 'neutral' })
    return
  }
  saving.value = true
  try {
    const updated = await $fetch<Product>(`/api/admin/products/${props.product.id}`, { method: 'PATCH', body: body as ProductInput })
    submitted.value = false
    emit('saved', updated)
    toast.add({ title: 'Información guardada', color: 'success' })
  }
  catch (e) {
    errors.value = cmsErrors(e)
  }
  finally {
    saving.value = false
  }
}

const uploadingImage = ref(false)
async function onImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 ** 2) {
    toast.add({ title: 'Sube una imagen JPG o PNG de hasta 5 MB.', color: 'error' })
    return
  }
  uploadingImage.value = true
  try {
    emit('saved', await uploadProductImage(props.product.id, file))
    toast.add({ title: 'Portada actualizada', color: 'success' })
  }
  catch (e) {
    const problem = cmsErrors(e)
    toast.add({ title: problem.fields.image || problem.general || 'No se pudo subir la imagen.', color: 'error' })
  }
  finally {
    uploadingImage.value = false
  }
}
</script>

<template>
  <div>
    <section class="admin-panel">
      <h2>Portada</h2>
      <p class="muted panel-intro">Se muestra en el catálogo y en la página del curso. Usa una imagen horizontal (16:9), por ejemplo de 1280 × 720.</p>
      <div class="cover-row">
        <div class="cover">
          <img v-if="product.image" :src="product.image" alt="Portada actual">
          <span v-else class="cover-fallback" aria-hidden="true">{{ product.org }}</span>
        </div>
        <label class="btn btn-secondary" :class="{ disabled: uploadingImage }">
          <input type="file" class="visually-hidden" accept="image/jpeg,image/png" :disabled="uploadingImage" @change="onImage">
          {{ uploadingImage ? 'Subiendo…' : product.image ? 'Cambiar imagen' : 'Subir imagen' }}
        </label>
      </div>
    </section>

    <form class="admin-panel" novalidate @submit.prevent="save">
      <h2>Información del curso</h2>
      <p class="muted panel-intro">Los cambios se aplican de inmediato; el sitio puede tardar hasta un minuto en mostrarlos.</p>

      <div v-if="errors?.general" class="notice notice-error" role="alert">{{ errors.general }}</div>

      <div class="field">
        <label for="info-title">Nombre</label>
        <input id="info-title" v-model="form.title" type="text" maxlength="255" :aria-invalid="submitted && invalid.title || !!fieldError('title')" required>
        <p v-if="fieldError('title')" class="field-hint error">{{ fieldError('title') }}</p>
      </div>

      <div class="field">
        <label for="info-short">Descripción corta</label>
        <textarea id="info-short" v-model="form.short_description" rows="3" maxlength="500" :aria-invalid="!!fieldError('short_description')" />
        <p v-if="fieldError('short_description')" class="field-hint error">{{ fieldError('short_description') }}</p>
        <p v-else class="field-hint">Una o dos frases para las tarjetas del catálogo.</p>
      </div>

      <div class="field">
        <label for="info-description">Descripción completa</label>
        <textarea id="info-description" v-model="form.description" rows="10" :aria-invalid="!!fieldError('description')" />
        <p class="field-hint">Aparece en la página del curso en Campus. Separa los párrafos con una línea en blanco.</p>
      </div>

      <h3 class="subhead">Fechas y equipo</h3>
      <p v-if="locked" class="notice notice-info">
        El curso ya existe en Open edX: las fechas, la modalidad y el equipo se cambian en
        <a :href="studioSettingsUrl" target="_blank" rel="noopener">Studio → Configuración</a>.
      </p>

      <div class="field-row">
        <div class="field">
          <label for="info-pacing">Modalidad</label>
          <select id="info-pacing" v-model="form.pacing" :disabled="locked">
            <option value="self">A tu ritmo</option>
            <option value="instructor">Con fechas del instructor</option>
          </select>
        </div>
        <div class="field">
          <label for="info-start">Inicio</label>
          <input id="info-start" v-model="form.start" type="date" :disabled="locked" :aria-invalid="!!fieldError('start')">
          <p v-if="fieldError('start')" class="field-hint error">{{ fieldError('start') }}</p>
        </div>
        <div class="field">
          <label for="info-end">Fin (opcional)</label>
          <input id="info-end" v-model="form.end" type="date" :disabled="locked" :aria-invalid="submitted && invalid.end || !!fieldError('end')">
          <p v-if="submitted && invalid.end" class="field-hint error">Debe ser posterior al inicio.</p>
          <p v-else-if="fieldError('end')" class="field-hint error">{{ fieldError('end') }}</p>
        </div>
      </div>
      <p class="field-hint">Hora del centro de México. Sin fecha de fin, el acceso es de por vida.</p>

      <div class="field">
        <label for="info-authors">Autores</label>
        <input id="info-authors" v-model="form.authors" type="text" :disabled="locked" placeholder="usuario1, usuario2" spellcheck="false"
               autocapitalize="none" :aria-invalid="!!fieldError('authors')">
        <p v-if="fieldError('authors')" class="field-hint error">{{ fieldError('authors') }}</p>
        <p v-else class="field-hint">Usuarios de Open edX, separados por coma. Pueden editar el contenido del curso.</p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.cover-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px 28px;
}

.cover {
  position: relative;
  width: min(320px, 100%);
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--brand-radius-sm);
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

label.btn {
  margin: 0;
}

label.btn:focus-within {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

label.btn.disabled {
  opacity: 0.55;
  cursor: progress;
}

.subhead {
  margin: 32px 0 12px;
  padding-top: 24px;
  border-top: 1px solid var(--ui-border);
  font-size: 1.05rem;
}

.notice-info {
  margin-bottom: 16px;
  font-size: 0.92rem;
}

.field-hint.error {
  color: var(--ui-color-error-600);
}

input:disabled,
select:disabled {
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
  cursor: not-allowed;
}
</style>
