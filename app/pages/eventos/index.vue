<script setup lang="ts">
useSeoMeta({
  title: 'Eventos',
  description: 'Webinars, ferias y sesiones en vivo.',
})

const now = contentNow()
const { data: upcoming } = await useAsyncData('events-upcoming', () =>
  queryCollection('eventos').where('date', '>=', now).order('date', 'ASC').all(),
)
const { data: past } = await useAsyncData('events-past', () =>
  queryCollection('eventos').where('date', '<', now).order('date', 'DESC').all(),
)

const next = computed(() => upcoming.value?.[0])
const later = computed(() => upcoming.value?.slice(1) ?? [])
</script>

<template>
  <div class="section container">
    <header class="header rise">
      <h1>Eventos</h1>
      <p class="muted lead">Webinars, ferias y sesiones en vivo con instructores.</p>
    </header>

    <NuxtLink v-if="next" :to="next.path" class="next rise" style="--i: 1">
      <div class="next-date">
        <span class="next-weekday">{{ formatDate(next.date, { weekday: 'long' }) }}</span>
        <span class="next-day">{{ formatDate(next.date, { day: 'numeric' }) }}</span>
        <span class="next-month">{{ formatDate(next.date, { month: 'long', year: 'numeric' }) }}</span>
      </div>
      <div class="next-body">
        <p class="next-label">Próximo evento</p>
        <h2>{{ next.title }}</h2>
        <p v-if="next.description" class="muted next-description">{{ next.description }}</p>
        <dl class="meta">
          <div>
            <dt>Hora</dt>
            <dd>{{ formatDate(next.date, { timeStyle: 'short' }) }}</dd>
          </div>
          <div>
            <dt>Lugar</dt>
            <dd>{{ next.location }}</dd>
          </div>
          <div>
            <dt>Modalidad</dt>
            <dd>{{ next.modality }}</dd>
          </div>
        </dl>
        <span class="btn btn-primary next-cta">Ver detalles</span>
      </div>
    </NuxtLink>

    <div v-else class="empty rise" style="--i: 1">
      <h2>No hay eventos programados</h2>
      <p class="muted">Publicaremos nuevas fechas pronto. Mientras tanto, explora el catálogo.</p>
      <NuxtLink to="/cursos" class="btn btn-secondary">Ver cursos</NuxtLink>
    </div>

    <section v-if="later.length" class="event-group rise" style="--i: 2">
      <h2 class="group-title">Más adelante</h2>
      <ul class="rows">
        <li v-for="event in later" :key="event.path">
          <NuxtLink :to="event.path" class="row">
            <span class="row-date">
              <span class="row-day">{{ formatDate(event.date, { day: 'numeric' }) }}</span>
              <span class="row-month">{{ formatDate(event.date, { month: 'short' }) }}</span>
            </span>
            <span class="row-main">
              <span class="row-title">{{ event.title }}</span>
              <span class="muted row-meta">{{ formatDate(event.date, { weekday: 'long', hour: 'numeric', minute: '2-digit' }) }}, {{ event.location }}</span>
            </span>
            <span class="badge">{{ event.modality }}</span>
            <span class="row-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section v-if="past?.length" class="event-group past">
      <h2 class="group-title">Anteriores</h2>
      <ul class="rows">
        <li v-for="event in past" :key="event.path">
          <NuxtLink :to="event.path" class="row">
            <span class="row-date">
              <span class="row-day">{{ formatDate(event.date, { day: 'numeric' }) }}</span>
              <span class="row-month">{{ formatDate(event.date, { month: 'short', year: '2-digit' }) }}</span>
            </span>
            <span class="row-main">
              <span class="row-title">{{ event.title }}</span>
              <span class="muted row-meta">{{ event.location }}</span>
            </span>
            <span class="badge">{{ event.modality }}</span>
            <span class="row-arrow" aria-hidden="true">→</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
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

/* Next event: the date gets its own column so it reads first. */
.next {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
}

.next:hover {
  border-color: color-mix(in srgb, var(--ui-primary) 25%, transparent);
  box-shadow: 0 2px 4px color-mix(in srgb, var(--ui-primary) 6%, transparent), 0 16px 40px color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

.next:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}

.next-date {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 28px 24px;
  background: var(--gradient-brand);
  color: var(--ui-text-inverted);
}

.next-weekday,
.next-month {
  font-size: 1rem;
  font-weight: 500;
  opacity: 0.85;
}

.next-weekday::first-letter {
  text-transform: uppercase;
}

.next-day {
  font-size: clamp(4rem, 9vw, 6.5rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}

.next-body {
  padding: 28px 24px;
}

.next-label {
  margin: 0 0 8px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ui-primary);
}

.next h2 {
  margin: 0 0 12px;
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.next-description {
  margin: 0 0 24px;
  max-width: 56ch;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 32px;
  margin: 0 0 28px;
}

.meta dt {
  font-size: 0.82rem;
  color: var(--ui-text-muted);
}

.meta dd {
  margin: 0;
  font-weight: 600;
}

.next:hover .next-cta {
  background: var(--ui-color-primary-600);
}

@media (min-width: 768px) {
  .next {
    grid-template-columns: 280px 1fr;
  }

  .next-date {
    padding: 40px 32px;
  }

  .next-body {
    padding: 40px;
  }
}

.event-group {
  margin-top: 56px;
}

.group-title {
  margin: 0 0 12px;
  font-size: 1.3rem;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--ui-border);
}

.row {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: center;
  gap: 4px 20px;
  padding: 18px 8px;
  border-bottom: 1px solid var(--ui-border);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s;
}

.row:hover {
  background: var(--ui-bg);
}

.row:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}

.row-date {
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.1;
  color: var(--ui-primary);
}

.row-day {
  font-size: 1.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.row-month {
  font-size: 0.8rem;
  font-weight: 600;
}

.row-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.row-title {
  font-weight: 600;
  font-size: 1.05rem;
}

.row-meta {
  font-size: 0.92rem;
}

.row-meta::first-letter {
  text-transform: uppercase;
}

.row .badge {
  justify-self: start;
}

.row-arrow {
  display: none;
}

@media (min-width: 768px) {
  .row {
    grid-template-columns: 56px minmax(0, 1fr) auto 24px;
    padding: 20px 12px;
  }

  .row-date {
    grid-row: auto;
  }

  .row-arrow {
    display: block;
    color: var(--ui-text-muted);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s;
  }

  .row:hover .row-arrow {
    color: var(--ui-primary);
    transform: translateX(4px);
  }
}

.past .row-date {
  color: var(--ui-text-muted);
}

.past .badge {
  background: var(--ui-border);
  color: var(--ui-text-muted);
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
