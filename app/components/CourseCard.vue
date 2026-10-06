<script setup lang="ts">
defineProps<{ course: CourseSummary }>()
</script>

<template>
  <NuxtLink :to="coursePath(course.id)" class="card course-card">
    <div class="cover">
      <img v-if="course.image" :src="course.image" :alt="''" loading="lazy">
    </div>
    <div class="body">
      <p class="org">{{ course.org }}</p>
      <h3>{{ course.name }}</h3>
      <p v-if="course.shortDescription" class="muted description">{{ course.shortDescription }}</p>
      <div class="footer">
        <span v-if="course.purchasable" class="price">{{ formatPrice(course.price, course.currency) }}</span>
        <span v-else class="muted">Próximamente</span>
        <span class="muted pacing">{{ course.pacing === 'self' ? 'A tu ritmo' : 'Con fechas' }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.course-card {
  display: flex;
  flex-direction: column;
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.15s, transform 0.15s;
}

.course-card:hover {
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary-soft), #f3e7df);
}

.cover img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 18px 20px 20px;
}

.org {
  margin: 0 0 4px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
}

h3 {
  margin: 0 0 8px;
  font-size: 1.1rem;
}

.description {
  margin: 0 0 16px;
  font-size: 0.95rem;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price {
  font-weight: 700;
  font-size: 1.1rem;
}

.pacing {
  font-size: 0.85rem;
}
</style>
