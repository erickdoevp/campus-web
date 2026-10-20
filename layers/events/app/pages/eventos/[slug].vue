<script setup lang="ts">
const route = useRoute()
const { data: event } = await useAsyncData(`event-${route.path}`, () =>
  queryCollection('eventos').path(route.path).first(),
)
if (!event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado', fatal: true })
}

useSeoMeta({
  title: event.value.title,
  description: event.value.description,
})

const isPast = computed(() => parseDate(event.value!.date) < new Date())

const { data: others } = await useAsyncData(`event-others-${route.path}`, () =>
  queryCollection('eventos').where('date', '>=', contentNow()).where('path', '<>', route.path).order('date', 'ASC').limit(3).all(),
)
</script>

<template>
  <div v-if="event">
    <header class="event-hero">
      <div class="container hero-grid">
        <div class="date-tile rise" :class="{ past: isPast }" aria-hidden="true">
          <span class="tile-month">{{ formatDate(event.date, { month: 'short' }) }}</span>
          <span class="tile-day">{{ formatDate(event.date, { day: 'numeric' }) }}</span>
        </div>
        <div>
          <NuxtLink to="/eventos" class="back-link rise" style="--i: 1">← Todos los eventos</NuxtLink>
          <h1 class="rise" style="--i: 2">{{ event.title }}</h1>
          <p v-if="event.description" class="lead rise" style="--i: 3">{{ event.description }}</p>
        </div>
      </div>
    </header>

    <div class="container layout">
      <aside class="details-slot">
        <div class="details rise" style="--i: 4">
          <p v-if="isPast" class="notice notice-warning">Este evento ya se realizó.</p>
          <dl>
            <div>
              <dt>Fecha</dt>
              <dd class="first-upper">{{ formatDate(event.date, { dateStyle: 'full' }) }}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{{ formatDate(event.date, { timeStyle: 'short' }) }} (hora del centro de México)</dd>
            </div>
            <div>
              <dt>Lugar</dt>
              <dd>{{ event.location }}</dd>
            </div>
            <div>
              <dt>Modalidad</dt>
              <dd><span class="badge">{{ event.modality }}</span></dd>
            </div>
          </dl>
          <a
            v-if="event.registrationUrl && !isPast"
            :href="event.registrationUrl"
            class="btn btn-primary register"
            target="_blank"
            rel="noopener"
          >
            Registrarme
          </a>
        </div>
      </aside>

      <ContentRenderer :value="event" class="prose body" />
    </div>

    <section v-if="others?.length" class="container others">
      <h2>Otros eventos</h2>
      <div class="card-grid">
        <EventCard v-for="other in others" :key="other.path" :event="other" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.event-hero {
  padding: 40px 0 48px;
  background:
    radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--brand-accent) 9%, transparent), transparent 45%),
    linear-gradient(180deg, var(--ui-color-primary-100), var(--ui-bg-muted));
  border-bottom: 1px solid var(--ui-border);
}

.hero-grid {
  display: grid;
  gap: 24px;
  align-items: end;
}

@media (min-width: 768px) {
  .hero-grid {
    grid-template-columns: 148px minmax(0, 1fr);
    gap: 40px;
  }
}

.date-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 104px;
  aspect-ratio: 1;
  border-radius: var(--brand-radius);
  background: var(--gradient-brand);
  color: var(--ui-text-inverted);
  box-shadow: 0 12px 32px color-mix(in srgb, var(--ui-primary) 22%, transparent);
}

.date-tile.past {
  background: var(--ui-text-muted);
  box-shadow: none;
}

@media (min-width: 768px) {
  .date-tile {
    width: 148px;
  }
}

.tile-month {
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: capitalize;
  opacity: 0.85;
}

.tile-day {
  font-size: clamp(2.8rem, 6vw, 4.2rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.back-link {
  margin-bottom: 16px;
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(2rem, 4.4vw, 3rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
  max-width: 22ch;
}

.lead {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ui-text-muted);
  max-width: 58ch;
}

.layout {
  display: grid;
  gap: 32px;
  padding-top: 32px;
}

@media (min-width: 960px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 64px;
    padding-top: 48px;
  }

  .details-slot {
    grid-column: 2;
    grid-row: 1;
  }

  .details {
    position: sticky;
    top: 92px;
  }

  .body {
    grid-column: 1;
    grid-row: 1;
  }
}

.details {
  padding: 24px;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
}

.details .notice {
  margin-bottom: 20px;
}

.details dl {
  display: grid;
  gap: 16px;
  margin: 0;
}

.details dt {
  font-size: 0.82rem;
  color: var(--ui-text-muted);
}

.details dd {
  margin: 2px 0 0;
  font-weight: 600;
}

.first-upper::first-letter {
  text-transform: uppercase;
}

.register {
  width: 100%;
  margin-top: 24px;
  padding-top: 14px;
  padding-bottom: 14px;
}

.body {
  font-size: 1.05rem;
}

.body > :deep(:first-child) {
  margin-top: 0;
}

.body :deep(h2) {
  margin: 40px 0 12px;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}

.body :deep(p),
.body :deep(li) {
  color: var(--ui-text);
}

.body :deep(li + li) {
  margin-top: 6px;
}

.body :deep(table) {
  display: table;
  margin: 8px 0 24px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  background: var(--ui-bg);
}

.body :deep(th) {
  background: var(--ui-color-primary-100);
  font-size: 0.85rem;
  color: var(--ui-primary);
}

.body :deep(td:first-child) {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.body :deep(tr:last-child td) {
  border-bottom: 0;
}

.others {
  margin-top: 72px;
}

.others h2 {
  margin: 0 0 20px;
  font-size: 1.3rem;
}
</style>
