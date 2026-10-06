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
</script>

<template>
  <div class="section container">
    <h1>Eventos</h1>
    <p class="muted intro">Webinars, ferias y sesiones en vivo con instructores.</p>

    <h2>Próximos</h2>
    <div v-if="upcoming?.length" class="grid">
      <EventCard v-for="event in upcoming" :key="event.path" :event="event" />
    </div>
    <p v-else class="muted">No hay eventos programados por ahora.</p>

    <template v-if="past?.length">
      <h2 class="past-title">Anteriores</h2>
      <div class="grid">
        <EventCard v-for="event in past" :key="event.path" :event="event" />
      </div>
    </template>
  </div>
</template>

<style scoped>
h1 {
  margin: 0 0 4px;
  font-size: 2.2rem;
}

.intro {
  margin: 0 0 40px;
}

h2 {
  font-size: 1.3rem;
}

.past-title {
  margin-top: 48px;
}
</style>
