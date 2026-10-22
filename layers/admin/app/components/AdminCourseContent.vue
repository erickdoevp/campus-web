<script setup lang="ts">
/** The course outline: modules, their lessons and the lessons' videos. */
const props = defineProps<{ course: AdminCourse }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const newModule = ref('')
const newLesson = reactive<Record<string, string>>({})
const busy = ref(false)

async function create(input: AdminBlockInput) {
  busy.value = true
  try {
    await $fetch(adminCourseApi(props.course.id, '/blocks'), { method: 'POST', body: input })
    emit('changed')
    return true
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo agregar.'), color: 'error' })
    return false
  }
  finally {
    busy.value = false
  }
}

async function addModule() {
  const title = newModule.value.trim()
  if (title && await create({ kind: 'module', title })) newModule.value = ''
}

async function addLesson(module: AdminModule) {
  const title = newLesson[module.id]?.trim()
  if (title && await create({ kind: 'lesson', parentId: module.id, title })) newLesson[module.id] = ''
}

async function renameModule(module: AdminModule, title: string) {
  try {
    await $fetch(adminCourseApi(props.course.id, `/blocks/${encodeURIComponent(module.id)}`), { method: 'PATCH', body: { title } })
    emit('changed')
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo renombrar.'), color: 'error' })
    throw e
  }
}

async function removeModule(module: AdminModule) {
  if (!confirm(`¿Eliminar el módulo “${module.title}” con todas sus lecciones y videos?`)) return
  try {
    await $fetch(adminCourseApi(props.course.id, `/blocks/${encodeURIComponent(module.id)}`), { method: 'DELETE' })
    emit('changed')
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo eliminar el módulo.'), color: 'error' })
  }
}
</script>

<template>
  <div>
    <div v-if="!course.modules.length" class="empty">
      <h2>Arma el temario</h2>
      <p class="muted">
        Un curso se organiza en <strong>módulos</strong>; cada módulo tiene <strong>lecciones</strong>, y en cada lección subes sus <strong>videos</strong>.
        Empieza agregando el primer módulo.
      </p>
    </div>

    <section v-for="(module, m) in course.modules" :key="module.id" class="module">
      <header class="module-head">
        <p class="eyebrow">Módulo {{ m + 1 }}</p>
        <div class="module-title-row">
          <AdminEditableTitle class="module-title" tag="h2" :title="module.title" :save="title => renameModule(module, title)" />
          <span v-if="module.hasChanges" class="badge badge-warning">Sin publicar</span>
          <button type="button" class="link-button danger" @click="removeModule(module)">Eliminar módulo</button>
        </div>
      </header>

      <ul v-if="module.lessons.length" class="lessons">
        <AdminLesson
          v-for="(lesson, l) in module.lessons"
          :key="lesson.id"
          :course-id="course.id"
          :lesson="lesson"
          :number="`${m + 1}.${l + 1}`"
          @changed="emit('changed')"
        />
      </ul>
      <p v-else class="muted no-lessons">Este módulo aún no tiene lecciones.</p>

      <form class="add-form" @submit.prevent="addLesson(module)">
        <label :for="`new-lesson-${module.id}`" class="visually-hidden">Nombre de la nueva lección</label>
        <input :id="`new-lesson-${module.id}`" v-model="newLesson[module.id]" type="text" maxlength="255" placeholder="Nombre de la nueva lección">
        <button type="submit" class="btn btn-secondary" :disabled="busy || !newLesson[module.id]?.trim()">Agregar lección</button>
      </form>
    </section>

    <form class="add-form add-module" @submit.prevent="addModule">
      <label for="new-module" class="visually-hidden">Nombre del nuevo módulo</label>
      <input id="new-module" v-model="newModule" type="text" maxlength="255" placeholder="Nombre del nuevo módulo, p. ej. Introducción">
      <button type="submit" class="btn btn-primary" :disabled="busy || !newModule.trim()">Agregar módulo</button>
    </form>
  </div>
</template>

<style scoped>
.empty {
  margin-bottom: 24px;
  padding: 40px 24px;
  border: 1px dashed var(--ui-border);
  border-radius: var(--brand-radius);
  text-align: center;
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.empty p {
  margin: 0 auto;
  max-width: 56ch;
}

.module {
  margin-bottom: 20px;
  padding: 20px 20px 24px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
}

@media (min-width: 768px) {
  .module {
    padding: 24px 28px 28px;
  }
}

.module-head {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ui-border);
}

.module-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

.module-title {
  flex: 1 1 240px;
}

.module-title :deep(.title) {
  font-size: 1.3rem;
}

.lessons {
  margin: 0;
  padding: 0;
  list-style: none;
}

.no-lessons {
  margin: 16px 0 0;
}

.add-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.add-form input {
  flex: 1 1 260px;
  width: auto;
}

.add-module {
  padding: 20px;
  border: 1px dashed var(--ui-border);
  border-radius: var(--brand-radius);
}
</style>
