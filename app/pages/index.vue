<script setup lang="ts">
useSeoMeta({
  title: 'Inicio',
  description: 'Cursos en línea con acceso de por vida. Paga una vez y aprende a tu ritmo.',
})

const { data: courses } = await useFetch('/api/courses')
const featured = computed(() => (courses.value ?? []).slice(0, 6))

const { data: events } = await useAsyncData('home-events', () =>
  queryCollection('eventos').where('date', '>=', contentNow()).order('date', 'ASC').limit(3).all(),
)
</script>

<template>
  <div>
    <section class="hero">
      <div class="container hero-inner">
        <p class="eyebrow">Aprende a tu ritmo</p>
        <h1>Cursos en línea con acceso de por vida</h1>
        <p class="lead muted">Compra el curso una vez y vuelve a él cuando quieras: sin suscripciones ni fechas de vencimiento.</p>
        <div class="hero-actions">
          <NuxtLink to="/cursos" class="btn btn-primary">Ver cursos</NuxtLink>
          <NuxtLink to="/eventos" class="btn btn-secondary">Próximos eventos</NuxtLink>
        </div>
      </div>
    </section>

    <section class="section container">
      <div class="section-header">
        <h2>Cursos destacados</h2>
        <NuxtLink to="/cursos">Ver todos</NuxtLink>
      </div>
      <div v-if="featured.length" class="card-grid">
        <CourseCard v-for="course in featured" :key="course.id" :course="course" />
      </div>
      <p v-else class="muted">Pronto publicaremos nuevos cursos.</p>
    </section>

    <section v-if="events?.length" class="section container">
      <div class="section-header">
        <h2>Próximos eventos</h2>
        <NuxtLink to="/eventos">Ver todos</NuxtLink>
      </div>
      <div class="card-grid">
        <EventCard v-for="event in events" :key="event.path" :event="event" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding: 72px 0 56px;
  background:
    radial-gradient(circle at 85% 20%, color-mix(in srgb, var(--brand-accent) 12%, transparent), transparent 40%),
    radial-gradient(circle at 10% 90%, color-mix(in srgb, var(--ui-primary) 10%, transparent), transparent 45%);
  border-bottom: 1px solid var(--ui-border);
}

h1,
.lead,
.eyebrow {
  max-width: 820px;
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(2.1rem, 5vw, 3.4rem);
}

.lead {
  margin: 0 0 28px;
  font-size: 1.15rem;
  max-width: 58ch;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
