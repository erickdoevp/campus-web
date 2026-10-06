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
</script>

<template>
  <article v-if="event" class="section container">
    <NuxtLink to="/eventos" class="back">← Eventos</NuxtLink>
    <span class="badge">{{ event.modality }}</span>
    <h1>{{ event.title }}</h1>
    <p class="meta muted">
      {{ formatDate(event.date, { dateStyle: 'full', timeStyle: 'short' }) }} · {{ event.location }}
    </p>
    <a v-if="event.registrationUrl" :href="event.registrationUrl" class="btn btn-primary" target="_blank" rel="noopener">
      Registrarme
    </a>
    <ContentRenderer :value="event" class="prose body" />
  </article>
</template>

<style scoped>
.back {
  display: block;
  margin-bottom: 24px;
  text-decoration: none;
}

h1 {
  margin: 12px 0 8px;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
}

.meta {
  margin: 0 0 24px;
}

.body {
  margin-top: 32px;
}
</style>
