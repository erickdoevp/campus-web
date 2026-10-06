<script setup lang="ts">
useSeoMeta({
  title: 'Cursos',
  description: 'Catálogo de cursos en línea con acceso de por vida.',
})

const { data: courses } = await useFetch('/api/courses')

const search = ref('')
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  const all = courses.value ?? []
  if (!term) return all
  return all.filter(c => normalize(`${c.name} ${c.org} ${c.shortDescription}`).includes(term))
})
</script>

<template>
  <div class="section container">
    <div class="header">
      <div>
        <h1>Cursos</h1>
        <p class="muted">{{ courses?.length ?? 0 }} cursos disponibles</p>
      </div>
      <div class="search">
        <label for="search" class="visually-hidden">Buscar cursos</label>
        <input id="search" v-model="search" type="search" placeholder="Buscar por nombre o tema">
      </div>
    </div>

    <div v-if="filtered.length" class="grid">
      <CourseCard v-for="course in filtered" :key="course.id" :course="course" />
    </div>
    <p v-else class="muted">No encontramos cursos para “{{ search }}”.</p>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 32px;
}

h1 {
  margin: 0 0 4px;
  font-size: 2.2rem;
}

.header p {
  margin: 0;
}

.search {
  width: 100%;
  max-width: 360px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
