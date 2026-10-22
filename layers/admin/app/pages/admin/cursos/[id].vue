<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const config = useRuntimeConfig()
const toast = useToast()
const id = route.params.id as string

const { data: course, error, refresh } = await useFetch<AdminCourse>(adminCourseApi(id), { key: `admin-course-${id}` })
if (error.value?.statusCode === 404 || error.value?.statusCode === 400) {
  throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado', fatal: true })
}

useSeoMeta({ title: () => course.value?.name ?? 'Curso' })

const tabs = [
  { value: 'contenido', label: 'Contenido' },
  { value: 'informacion', label: 'Información' },
  { value: 'venta', label: 'Precio y visibilidad' },
] as const
type Tab = typeof tabs[number]['value']
const tab = computed<Tab>({
  get: () => tabs.some(t => t.value === route.query.tab) ? route.query.tab as Tab : 'contenido',
  set: value => navigateTo({ query: { ...route.query, tab: value === 'contenido' ? undefined : value } }, { replace: true }),
})

const publishing = ref(false)
async function publish() {
  publishing.value = true
  try {
    course.value = await $fetch<AdminCourse>(adminCourseApi(id, '/publish'), { method: 'POST' })
    toast.add({ title: 'Cambios publicados', description: 'Los alumnos ya ven el contenido actualizado.', color: 'success' })
  }
  catch (e) {
    toast.add({ title: apiErrorMessage(e, 'No se pudo publicar.'), color: 'error' })
  }
  finally {
    publishing.value = false
  }
}

const studioCourseUrl = `${config.public.studioUrl}/course/${id}`
</script>

<template>
  <div class="section container">
    <NuxtLink to="/admin" class="back-link rise">← Cursos</NuxtLink>

    <div v-if="error || !course" class="notice notice-error" role="alert">
      {{ apiErrorMessage(error, 'No pudimos cargar el curso.') }}
      <button type="button" class="link-button" @click="refresh()">Reintentar</button>
    </div>

    <template v-else>
      <header class="admin-header course-header rise" style="--i: 1">
        <div class="course-heading">
          <p class="eyebrow">{{ course.org }} / {{ course.number }} / {{ course.run }}</p>
          <h1>{{ course.name }}</h1>
          <div class="status">
            <span v-if="course.hasUnpublishedChanges" class="badge badge-warning">Cambios sin publicar</span>
            <span v-else-if="course.modules.length" class="badge badge-success">Contenido publicado</span>
            <span v-if="course.price" class="badge">{{ formatPrice(course.price, course.currency) }}</span>
            <span v-else class="badge badge-muted">Sin precio</span>
            <span v-if="!course.visible" class="badge badge-muted">Oculto del catálogo</span>
          </div>
        </div>
        <div class="course-actions">
          <button type="button" class="btn btn-primary" :disabled="publishing || !course.hasUnpublishedChanges" @click="publish">
            {{ publishing ? 'Publicando…' : 'Publicar cambios' }}
          </button>
          <NuxtLink :to="coursePath(course.id)" class="btn btn-secondary" target="_blank">Ver en Campus</NuxtLink>
          <a :href="studioCourseUrl" class="btn btn-secondary" target="_blank" rel="noopener">Abrir en Studio</a>
        </div>
      </header>

      <div v-if="course.hasUnpublishedChanges" class="notice notice-info rise" style="--i: 2" role="status">
        Los módulos, lecciones y videos nuevos o modificados no aparecen a los alumnos hasta que pulses <strong>Publicar cambios</strong>.
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
          @click="tab = t.value"
        >
          {{ t.label }}
        </button>
      </div>

      <div :id="`panel-${tab}`" role="tabpanel" :aria-labelledby="`tab-${tab}`" class="rise" style="--i: 3">
        <AdminCourseContent v-if="tab === 'contenido'" :course="course" @changed="refresh()" />
        <AdminCourseInfo v-else-if="tab === 'informacion'" :course="course" @saved="updated => course = updated" />
        <AdminCourseSale v-else :course="course" @saved="refresh()" />
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

.chip:hover {
  border-color: var(--ui-text-highlighted);
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
</style>
