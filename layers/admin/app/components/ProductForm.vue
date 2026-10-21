<script setup lang="ts">
/**
 * Create / edit form for a product. Emits only the fields that changed when
 * editing (and everything when creating), plus the newly picked image.
 */
const props = defineProps<{
  product?: Product
  pending?: boolean
  errors?: CmsErrors
  submitLabel: string
}>()

const emit = defineEmits<{ submit: [input: ProductInput, image: File | null] }>()

// Form state as strings, the way the inputs hold them.
function formState(product?: Product) {
  return {
    title: product?.title ?? '',
    number: product?.number ?? '',
    run: product?.run ?? '',
    price: product?.price != null ? String(Number(product.price)) : '',
    short_description: product?.short_description ?? '',
    description: product?.description ?? '',
    start: toLocalInput(product?.start ?? null),
    end: toLocalInput(product?.end ?? null),
    pacing: product?.pacing ?? 'self',
    authors: product?.authors.join(', ') ?? '',
  }
}

type FormState = ReturnType<typeof formState>
const image = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const initial = computed(() => formState(props.product))
const form = reactive<FormState>(formState(props.product))
// A saved product comes back from the CMS: start over from it.
watch(() => props.product, (product) => {
  Object.assign(form, formState(product))
  image.value = null
})

// Once the course exists in Open edX, Studio owns these.
const locked = computed(() => !!props.product?.course_key)

watch(image, (file, _old, onCleanup) => {
  imagePreview.value = file ? URL.createObjectURL(file) : null
  onCleanup(() => { if (imagePreview.value) URL.revokeObjectURL(imagePreview.value) })
})
const shownImage = computed(() => imagePreview.value ?? props.product?.image ?? null)

function pickImage(event: Event) {
  image.value = (event.target as HTMLInputElement).files?.[0] ?? null
}

const toInput: { [K in keyof FormState]: (value: FormState[K]) => ProductInput[keyof ProductInput] } = {
  title: v => v.trim(),
  number: v => v.trim(),
  run: v => v.trim(),
  // v-model on <input type="number"> hands back a number once edited.
  price: v => (String(v).trim() === '' ? null : String(v).trim()),
  short_description: v => v.trim(),
  description: v => v,
  start: v => fromLocalInput(v),
  end: v => fromLocalInput(v),
  pacing: v => v,
  authors: v => v.split(/[\s,]+/).filter(Boolean),
}

function submit() {
  const input: Record<string, unknown> = {}
  for (const key of Object.keys(toInput) as (keyof FormState)[]) {
    if (!props.product || String(form[key]) !== initial.value[key]) {
      input[key] = (toInput[key] as (value: string) => unknown)(form[key])
    }
  }
  emit('submit', input as ProductInput, image.value)
}

const fieldError = (name: string) => props.errors?.fields[name]

// Saving may happen far below the first problem: bring it into view.
const formEl = ref<HTMLFormElement>()
watch(() => props.errors, async (errors) => {
  if (!errors) return
  await nextTick()
  const target = formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  if (target?.matches('input, textarea')) target.focus({ preventScroll: true })
})
</script>

<template>
  <form ref="formEl" class="product-form" novalidate @submit.prevent="submit">
    <div v-if="errors?.general" class="notice notice-warning" role="alert">{{ errors.general }}</div>

    <fieldset>
      <legend>Curso</legend>

      <div class="field">
        <label for="title">Título</label>
        <input id="title" v-model="form.title" required maxlength="255" :aria-invalid="!!fieldError('title')">
        <p v-if="fieldError('title')" class="error">{{ fieldError('title') }}</p>
      </div>

      <div class="row">
        <div class="field">
          <label for="number">Código</label>
          <input id="number" v-model="form.number" required maxlength="64" placeholder="CONT101" :disabled="locked"
                 autocapitalize="characters" spellcheck="false" :aria-invalid="!!fieldError('number')">
          <p v-if="fieldError('number')" class="error">{{ fieldError('number') }}</p>
        </div>
        <div class="field">
          <label for="run">Periodo</label>
          <input id="run" v-model="form.run" required maxlength="64" placeholder="2026_T1" :disabled="locked"
                 spellcheck="false" :aria-invalid="!!fieldError('run')">
          <p v-if="fieldError('run')" class="error">{{ fieldError('run') }}</p>
        </div>
      </div>
      <p class="hint muted">
        Forman la clave del curso en Open edX. Solo letras, números, guion, guion bajo o punto; no cambian después de crearlo.
      </p>

      <div class="field">
        <label for="short_description">Descripción corta</label>
        <textarea id="short_description" v-model="form.short_description" rows="2" maxlength="500" />
        <p class="hint muted">Aparece en las tarjetas del catálogo.</p>
      </div>

      <div class="field">
        <label for="description">Descripción</label>
        <textarea id="description" v-model="form.description" rows="8" />
        <p class="hint muted">Aparece en la página del curso en Campus. Separa los párrafos con una línea en blanco.</p>
      </div>
    </fieldset>

    <fieldset>
      <legend>Venta</legend>
      <div class="field price">
        <label for="price">Precio (MXN)</label>
        <div class="price-input">
          <span aria-hidden="true">$</span>
          <input id="price" v-model="form.price" type="number" inputmode="numeric" min="0" step="1" placeholder="1499"
                 :aria-invalid="!!fieldError('price')">
        </div>
        <p v-if="fieldError('price')" class="error">{{ fieldError('price') }}</p>
        <p v-else class="hint muted">Pesos enteros, pago único.</p>
      </div>

      <div class="field">
        <span class="label">Imagen</span>
        <div class="image-picker">
          <div class="image-preview">
            <img v-if="shownImage" :src="shownImage" alt="">
            <span v-else class="muted">Sin imagen</span>
          </div>
          <div>
            <input id="image" class="visually-hidden" type="file" accept="image/png,image/jpeg" @change="pickImage">
            <label for="image" class="btn btn-secondary file-button">{{ shownImage ? 'Cambiar imagen' : 'Elegir imagen' }}</label>
            <p class="hint muted">JPG o PNG, hasta 5 MB. Proporción 16:9 (por ejemplo 1280 × 720).</p>
            <p v-if="fieldError('image')" class="error">{{ fieldError('image') }}</p>
          </div>
        </div>
      </div>
    </fieldset>

    <fieldset>
      <legend>Open edX</legend>
      <p v-if="locked" class="notice notice-info">
        El curso ya existe en Open edX: fechas, modalidad y equipo se cambian en Studio.
      </p>

      <div class="row">
        <div class="field">
          <label for="start">Inicio</label>
          <input id="start" v-model="form.start" type="datetime-local" :disabled="locked" :aria-invalid="!!fieldError('start')">
          <p v-if="fieldError('start')" class="error">{{ fieldError('start') }}</p>
        </div>
        <div class="field">
          <label for="end">Fin <span class="muted optional">(opcional)</span></label>
          <input id="end" v-model="form.end" type="datetime-local" :disabled="locked" :aria-invalid="!!fieldError('end')">
          <p v-if="fieldError('end')" class="error">{{ fieldError('end') }}</p>
        </div>
      </div>
      <p class="hint muted">Hora del centro de México. Sin fecha de fin, el acceso es de por vida.</p>

      <div class="field" role="radiogroup" aria-labelledby="pacing-label">
        <span id="pacing-label" class="label">Modalidad</span>
        <div class="choices">
          <label class="choice">
            <input v-model="form.pacing" type="radio" value="self" :disabled="locked">
            A tu ritmo
          </label>
          <label class="choice">
            <input v-model="form.pacing" type="radio" value="instructor" :disabled="locked">
            Con fechas del instructor
          </label>
        </div>
      </div>

      <div class="field">
        <label for="authors">Autores</label>
        <input id="authors" v-model="form.authors" :disabled="locked" placeholder="usuario1, usuario2" spellcheck="false"
               autocapitalize="none" :aria-invalid="!!fieldError('authors')">
        <p v-if="fieldError('authors')" class="error">{{ fieldError('authors') }}</p>
        <p v-else class="hint muted">Usuarios de Open edX, separados por coma. Tendrán el rol de instructor en Studio.</p>
      </div>
    </fieldset>

    <div class="actions">
      <button type="submit" class="btn btn-primary" :disabled="pending">
        {{ pending ? 'Guardando…' : submitLabel }}
      </button>
      <slot name="actions" />
    </div>
  </form>
</template>

<style scoped>
.product-form {
  display: grid;
  gap: 24px;
}

fieldset {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 24px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
}

legend {
  float: left;
  width: 100%;
  margin-bottom: 4px;
  font-size: 1.05rem;
  font-weight: 700;
}

.row {
  display: grid;
  gap: 18px;
}

@media (min-width: 640px) {
  .row {
    grid-template-columns: 1fr 1fr;
  }
}

.field {
  min-width: 0;
}

.label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
}

.optional {
  font-weight: 400;
}

.hint {
  margin: 6px 0 0;
  font-size: 0.85rem;
}

.row + .hint {
  margin-top: -10px;
}

.error {
  margin: 6px 0 0;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ui-color-error-600);
}

input[aria-invalid='true'],
textarea[aria-invalid='true'] {
  border-color: var(--ui-color-error-500);
}

input:disabled {
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
  cursor: not-allowed;
}

textarea {
  resize: vertical;
}

.price {
  max-width: 240px;
}

.price-input {
  position: relative;
}

.price-input span {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-muted);
}

.price-input input {
  padding-left: 28px;
}

.image-picker {
  display: grid;
  gap: 16px;
  align-items: start;
}

@media (min-width: 640px) {
  .image-picker {
    grid-template-columns: 240px 1fr;
  }
}

.image-preview {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--ui-border-accented);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg-muted);
  overflow: hidden;
  font-size: 0.9rem;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-button {
  margin: 0;
  padding: 9px 18px;
}

input[type='file']:focus-visible + .file-button {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.choices {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
}

.choice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-weight: 500;
  cursor: pointer;
}

.choice input {
  width: auto;
  margin: 0;
  accent-color: var(--ui-primary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
