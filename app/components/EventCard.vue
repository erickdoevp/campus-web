<script setup lang="ts">
defineProps<{
  event: { path: string, title: string, description?: string, date: string, location: string, modality: string }
}>()
</script>

<template>
  <NuxtLink :to="event.path" class="card event-card">
    <div class="date">
      <span class="day">{{ formatDate(event.date, { day: 'numeric' }) }}</span>
      <span class="month">{{ formatDate(event.date, { month: 'short' }) }}</span>
    </div>
    <div>
      <span class="badge">{{ event.modality }}</span>
      <h3>{{ event.title }}</h3>
      <p class="muted">{{ event.location }} · {{ formatDate(event.date, { timeStyle: 'short' }) }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.event-card {
  display: flex;
  gap: 20px;
  padding: 20px;
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.15s;
}

.event-card:hover {
  box-shadow: var(--shadow);
}

.date {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 72px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

.day {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
}

.month {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

h3 {
  margin: 8px 0 4px;
  font-size: 1.05rem;
}

p {
  margin: 0;
  font-size: 0.9rem;
}
</style>
