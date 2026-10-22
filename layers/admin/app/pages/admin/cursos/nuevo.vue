<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Nuevo curso' })

const toast = useToast()

// Suggest the organization the existing courses use.
const { data: courses } = await useFetch('/api/admin/courses', { default: () => [] })

const form = reactive({
  name: '',
  org: courses.value[0]?.org ?? '',
  number: '',
  run: String(new Date().getFullYear()),
  pacing: 'self' as 'self' | 'instructor',
  start: toDateInput(new Date().toISOString()),
  price: null as number | '' | null,
})

// The number follows the name until the user edits it.
const numberEdited = ref(false)
watch(() => form.name, (name) => {
  if (!numberEdited.value) form.number = courseNumberFrom(name)
})

const KEY_PART = /^[A-Za-z0-9_.-]+$/
const invalid = computed(() => ({
  name: !form.name.trim(),
  org: !KEY_PART.test(form.org.trim()),
  number: !KEY_PART.test(form.number.trim()),
  run: !KEY_PART.test(form.run.trim()),
  start: !form.start,
  // v-model.number leaves '' in an emptied field.
  price: typeof form.price === 'number' && (form.price < 0 || !Number.isInteger(form.price)),
}))
const courseKey = computed(() => `course-v1:${form.org.trim() || 'ORG'}+${form.number.trim() || 'NUMERO'}+${form.run.trim() || 'EDICION'}`)

const submitted = ref(false)
const saving = ref(false)
const error = ref('')

async function create() {
  submitted.value = true
  error.value = ''
  const firstInvalid = Object.entries(invalid.value).find(([, bad]) => bad)?.[0]
  if (firstInvalid) {
    document.getElementById(`course-${firstInvalid}`)?.focus()
    return
  }
  saving.value = true
  try {
    const created = await $fetch('/api/admin/courses', {
      method: 'POST',
      body: {
        name: form.name,
        org: form.org,
        number: form.number,
        run: form.run,
        pacing: form.pacing,
        start: fromDateInput(form.start),
        price: typeof form.price === 'number' && form.price > 0 ? form.price : null,
      } satisfies AdminCourseCreateInput,
    })
    toast.add({ title: 'Curso creado', description: 'Ahora agrega sus módulos, lecciones y videos.', color: 'success' })
    if (created.pending.length) {
      toast.add({ title: `No se guardó ${created.pending.join(' ni ')}`, description: 'Puedes configurarlo desde la página del curso.', color: 'warning' })
    }
    await navigateTo(adminCoursePath(created.id))
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo crear el curso.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="section container narrow">
    <NuxtLink to="/admin" class="back-link rise">← Cursos</NuxtLink>
    <header class="admin-header rise" style="--i: 1">
      <div>
        <h1>Nuevo curso</h1>
        <p class="muted lead">Se crea en Open edX. Podrás cambiar el nombre, las fechas y el precio después; la clave del curso no.</p>
      </div>
    </header>

    <form class="admin-panel rise" style="--i: 2" novalidate @submit.prevent="create">
      <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

      <div class="field">
        <label for="course-name">Nombre del curso</label>
        <input id="course-name" v-model="form.name" type="text" maxlength="255" placeholder="Excel avanzado para contadores" :aria-invalid="submitted && invalid.name" required>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="course-org">Organización</label>
          <input id="course-org" v-model="form.org" type="text" maxlength="64" placeholder="MCCorp" :aria-invalid="submitted && invalid.org" required>
        </div>
        <div class="field">
          <label for="course-number">Número</label>
          <input id="course-number" v-model="form.number" type="text" maxlength="64" placeholder="EXCEL-101" :aria-invalid="submitted && invalid.number" required @input="numberEdited = true">
        </div>
        <div class="field">
          <label for="course-run">Edición</label>
          <input id="course-run" v-model="form.run" type="text" maxlength="64" :aria-invalid="submitted && invalid.run" required>
        </div>
      </div>
      <p class="field-hint">
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
          <input id="course-start" v-model="form.start" type="date" :aria-invalid="submitted && invalid.start" required>
        </div>
      </div>

      <div class="field">
        <label for="course-price">Precio (MXN)</label>
        <div class="input-prefix">
          <span aria-hidden="true">$</span>
          <input id="course-price" v-model.number="form.price" type="number" min="0" step="1" inputmode="numeric" placeholder="1499" :aria-invalid="submitted && invalid.price">
        </div>
        <p class="field-hint">Déjalo vacío para que aparezca como “Próximamente” hasta que lo pongas a la venta.</p>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Creando…' : 'Crear curso' }}</button>
        <NuxtLink to="/admin" class="btn btn-secondary">Cancelar</NuxtLink>
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

code {
  font-size: 0.85em;
  overflow-wrap: anywhere;
}
</style>
