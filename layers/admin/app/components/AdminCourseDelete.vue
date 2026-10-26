<script setup lang="ts">
/** Deletes the course for good, after typing its number to confirm. */
const props = defineProps<{ course: AdminCourse }>()
const toast = useToast()

const open = ref(false)
const confirmation = ref('')
const deleting = ref(false)
const error = ref('')
const confirmed = computed(() => confirmation.value.trim() === props.course.number)

async function remove() {
  if (!confirmed.value) return
  deleting.value = true
  error.value = ''
  try {
    const result = await $fetch<{ deleted: Record<string, number> }>(adminCourseApi(props.course.id), { method: 'DELETE' })
    const enrollments = result.deleted.enrollments ?? 0
    clearNuxtData(`admin-course-${props.course.id}`)
    toast.add({
      title: `Se eliminó “${props.course.name}”`,
      description: enrollments ? `También se dieron de baja ${enrollments} ${enrollments === 1 ? 'inscripción' : 'inscripciones'}.` : undefined,
      color: 'success',
    })
    await navigateTo('/admin')
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo eliminar el curso.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="admin-panel danger-zone">
    <h2>Eliminar curso</h2>
    <p class="muted panel-intro">Borra el curso de Open edX y de Campus. No se puede deshacer.</p>

    <button v-if="!open" type="button" class="btn btn-danger" @click="open = true">Eliminar este curso…</button>

    <form v-else novalidate @submit.prevent="remove">
      <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

      <p class="list-title">Se elimina:</p>
      <ul class="consequences">
        <li>El contenido: módulos, lecciones, videos subidos y la portada.</li>
        <li>Las inscripciones de los alumnos, su progreso, calificaciones y certificados.</li>
        <li>El precio, los permisos del equipo y la página del curso en Campus.</li>
      </ul>
      <p class="muted kept">Las órdenes de pago se conservan como historial; Stripe guarda su propia copia. Si alguien pagó y quieres devolver el dinero, hazlo en Stripe.</p>

      <div class="field">
        <label for="delete-confirmation">Escribe <code>{{ course.number }}</code> para confirmar</label>
        <input id="delete-confirmation" v-model="confirmation" type="text" autocomplete="off" spellcheck="false" :disabled="deleting">
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-delete" :disabled="!confirmed || deleting">
          {{ deleting ? 'Eliminando…' : 'Eliminar curso definitivamente' }}
        </button>
        <button type="button" class="btn btn-secondary" :disabled="deleting" @click="open = false; confirmation = ''">Cancelar</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.danger-zone {
  margin-top: 24px;
  border-color: var(--ui-color-error-200);
}

.danger-zone h2 {
  color: var(--ui-color-error-700);
}

.list-title {
  margin: 0 0 6px;
  font-weight: 600;
}

.consequences {
  margin: 0 0 12px;
  padding-left: 1.2em;
  list-style: disc;
}

.consequences li + li {
  margin-top: 4px;
}

.kept {
  margin: 0 0 20px;
  font-size: 0.92rem;
}

code {
  font-size: 0.95em;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--ui-color-error-50);
  color: var(--ui-color-error-800);
}

.btn-delete {
  background: var(--ui-color-error-600);
  color: var(--ui-text-inverted);
}

.btn-delete:not([disabled]):hover {
  background: var(--ui-color-error-700);
}
</style>
