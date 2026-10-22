<script setup lang="ts">
/** Name, descriptions, dates, pacing and cover image. Saved right away (no publishing). */
const props = defineProps<{ course: AdminCourse }>()
const emit = defineEmits<{ saved: [course: AdminCourse] }>()
const toast = useToast()

function fromCourse(course: AdminCourse) {
  return {
    name: course.name,
    shortDescription: course.shortDescription,
    overview: course.overview,
    effort: course.effort,
    start: toDateInput(course.start),
    end: toDateInput(course.end),
    pacing: course.pacing,
  }
}
const form = reactive(fromCourse(props.course))

const invalid = computed(() => ({
  name: !form.name.trim(),
  start: !form.start,
  end: !!form.end && !!form.start && form.end <= form.start,
}))
const submitted = ref(false)
const saving = ref(false)
const error = ref('')

async function save() {
  submitted.value = true
  error.value = ''
  const firstInvalid = Object.entries(invalid.value).find(([, bad]) => bad)?.[0]
  if (firstInvalid) {
    document.getElementById(`info-${firstInvalid}`)?.focus()
    return
  }
  saving.value = true
  try {
    const updated = await $fetch<AdminCourse>(adminCourseApi(props.course.id), {
      method: 'PATCH',
      body: {
        ...form,
        start: fromDateInput(form.start),
        end: fromDateInput(form.end),
      } satisfies AdminCourseUpdateInput,
    })
    Object.assign(form, fromCourse(updated))
    submitted.value = false
    emit('saved', updated)
    toast.add({ title: 'Información guardada', color: 'success' })
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo guardar.')
  }
  finally {
    saving.value = false
  }
}

const image = ref(props.course.image)
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
    const body = new FormData()
    body.append('image', file)
    const saved = await $fetch<{ image: string }>(adminCourseApi(props.course.id, '/image'), { method: 'POST', body })
    // Same URL as before when only the content changed: bust the cache.
    image.value = `${saved.image}${saved.image.includes('?') ? '&' : '?'}v=${Date.now()}`
    toast.add({ title: 'Portada actualizada', color: 'success' })
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo subir la imagen.'), color: 'error' })
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
          <img v-if="image" :src="image" alt="Portada actual">
          <span v-else class="cover-fallback" aria-hidden="true">{{ course.org }}</span>
        </div>
        <label class="btn btn-secondary" :class="{ disabled: uploadingImage }">
          <input type="file" class="visually-hidden" accept="image/jpeg,image/png" :disabled="uploadingImage" @change="onImage">
          {{ uploadingImage ? 'Subiendo…' : image ? 'Cambiar imagen' : 'Subir imagen' }}
        </label>
      </div>
    </section>

    <form class="admin-panel" novalidate @submit.prevent="save">
      <h2>Información del curso</h2>
      <p class="muted panel-intro">Los cambios se aplican de inmediato; el sitio puede tardar hasta un minuto en mostrarlos.</p>

      <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

      <div class="field">
        <label for="info-name">Nombre</label>
        <input id="info-name" v-model="form.name" type="text" maxlength="255" :aria-invalid="submitted && invalid.name" required>
      </div>

      <div class="field">
        <label for="info-short">Descripción corta</label>
        <textarea id="info-short" v-model="form.shortDescription" rows="3" maxlength="1000" />
        <p class="field-hint">Una o dos frases para las tarjetas del catálogo.</p>
      </div>

      <div class="field">
        <label for="info-overview">Descripción completa</label>
        <textarea id="info-overview" v-model="form.overview" rows="10" maxlength="100000" />
        <p class="field-hint">Aparece en la página del curso. Acepta HTML, por ejemplo <code>&lt;h2&gt;</code>, <code>&lt;p&gt;</code> y <code>&lt;ul&gt;</code>.</p>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="info-pacing">Modalidad</label>
          <select id="info-pacing" v-model="form.pacing">
            <option value="self">A tu ritmo</option>
            <option value="instructor">Con fechas del instructor</option>
          </select>
        </div>
        <div class="field">
          <label for="info-effort">Dedicación</label>
          <input id="info-effort" v-model="form.effort" type="text" maxlength="60" placeholder="3 horas por semana">
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="info-start">Inicio</label>
          <input id="info-start" v-model="form.start" type="date" :aria-invalid="submitted && invalid.start" required>
        </div>
        <div class="field">
          <label for="info-end">Fin (opcional)</label>
          <input id="info-end" v-model="form.end" type="date" :aria-invalid="submitted && invalid.end">
          <p v-if="submitted && invalid.end" class="field-hint">Debe ser posterior al inicio.</p>
        </div>
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
</style>
