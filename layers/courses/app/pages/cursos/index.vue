<script setup lang="ts">
useSeoMeta({
  title: 'Cursos',
  description: 'Catálogo de cursos en línea con acceso de por vida.',
})

const { data: courses, status } = await useFetch('/api/courses')

const search = ref('')
const pacing = ref<'all' | 'self' | 'instructor'>('all')
const pacingOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'self', label: 'A tu ritmo' },
  { value: 'instructor', label: 'Con fechas' },
] as const

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const filtered = computed(() => {
  const term = normalize(search.value.trim())
  return (courses.value ?? []).filter((c) => {
    if (pacing.value === 'self' && c.pacing !== 'self') return false
    if (pacing.value === 'instructor' && c.pacing === 'self') return false
    return !term || normalize(`${c.name} ${c.org} ${c.shortDescription}`).includes(term)
  })
})

const total = computed(() => courses.value?.length ?? 0)

// The first course gets a wide card only on the unfiltered catalog.
const isFiltering = computed(() => !!search.value.trim() || pacing.value !== 'all')
const showFeatured = computed(() => !isFiltering.value && filtered.value.length > 2)

function resetFilters() {
  search.value = ''
  pacing.value = 'all'
}
</script>

<template>
  <div class="section container">
    <header class="header rise">
      <h1>Cursos</h1>
      <p class="muted lead">Paga una vez y conserva el acceso para siempre.</p>
    </header>

    <div class="toolbar rise" style="--i: 1">
      <div class="search">
        <label for="search">Buscar cursos</label>
        <input id="search" v-model="search" type="search" placeholder="Nombre, tema u organización" autocomplete="off">
      </div>
      <div class="filters" role="group" aria-label="Filtrar por modalidad">
        <button
          v-for="option in pacingOptions"
          :key="option.value"
          type="button"
          class="chip"
          :aria-pressed="pacing === option.value"
          @click="pacing = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p class="count muted" aria-live="polite">
      <template v-if="isFiltering">{{ filtered.length }} de {{ total }} {{ total === 1 ? 'curso' : 'cursos' }}</template>
      <template v-else>{{ total }} {{ total === 1 ? 'curso disponible' : 'cursos disponibles' }}</template>
    </p>

    <div v-if="status === 'pending'" class="card-grid" aria-busy="true">
      <div v-for="n in 3" :key="n" class="skeleton" />
    </div>

    <div v-else-if="filtered.length" class="card-grid">
      <CourseCard
        v-for="(course, i) in filtered"
        :key="course.id"
        :course="course"
        :featured="showFeatured && i === 0"
        :class="{ 'span-all': showFeatured && i === 0 }"
        class="rise"
        :style="{ '--i': Math.min(i, 6) + 2 }"
      />
    </div>

    <div v-else-if="isFiltering" class="empty">
      <h2>Sin resultados</h2>
      <p class="muted">No encontramos cursos con esos filtros. Prueba con otra palabra o quita los filtros.</p>
      <button type="button" class="btn btn-secondary" @click="resetFilters">Quitar filtros</button>
    </div>

    <div v-else class="empty">
      <h2>Pronto habrá cursos aquí</h2>
      <p class="muted">Estamos preparando el catálogo. Mientras tanto, revisa los próximos eventos.</p>
      <NuxtLink to="/eventos" class="btn btn-secondary">Ver eventos</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.header {
  margin-bottom: 32px;
}

h1 {
  margin: 0 0 8px;
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.lead {
  margin: 0;
  font-size: 1.1rem;
  max-width: 52ch;
}

.toolbar {
  display: grid;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--ui-border);
}

@media (min-width: 768px) {
  .toolbar {
    grid-template-columns: minmax(0, 420px) auto;
    justify-content: space-between;
    align-items: end;
  }
}

.search label {
  font-size: 0.9rem;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.chip[aria-pressed='true'] {
  background: var(--ui-text-highlighted);
  border-color: var(--ui-text-highlighted);
  color: var(--ui-text-inverted);
}

.chip:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.count {
  margin: 16px 0 20px;
  font-size: 0.9rem;
}

.card-grid {
  grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
}

.span-all {
  grid-column: 1 / -1;
}

.skeleton {
  aspect-ratio: 4 / 5;
  border-radius: var(--brand-radius);
  background: linear-gradient(100deg, var(--ui-border) 30%, var(--ui-bg) 50%, var(--ui-border) 70%);
  background-size: 300% 100%;
}

@media (prefers-reduced-motion: no-preference) {
  .skeleton {
    animation: shimmer 1.4s ease-in-out infinite;
  }
}

@keyframes shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: 0 0;
  }
}

.empty {
  padding: 56px 24px;
  border: 1px dashed var(--ui-border);
  border-radius: var(--brand-radius);
  text-align: center;
}

.empty h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.empty p {
  margin: 0 auto 24px;
  max-width: 44ch;
}
</style>
