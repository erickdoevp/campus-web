<script setup lang="ts">
defineProps<{ course: CourseSummary, featured?: boolean }>()
</script>

<template>
  <NuxtLink :to="coursePath(course.id)" class="course-card" :class="{ featured }">
    <div class="cover">
      <img v-if="course.image" :src="course.image" alt="" loading="lazy">
      <span v-else class="cover-fallback" aria-hidden="true">{{ course.org }}</span>
    </div>
    <div class="body">
      <p class="org">{{ course.org }}</p>
      <h3>{{ course.name }}</h3>
      <p v-if="course.shortDescription" class="muted description">{{ course.shortDescription }}</p>
      <div class="footer">
        <span v-if="course.purchasable" class="price">{{ formatPrice(course.price, course.currency) }}</span>
        <span v-else class="muted soon">Próximamente</span>
        <span class="pacing">{{ course.pacing === 'self' ? 'A tu ritmo' : 'Con fechas' }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.course-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  transition: box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
}

.course-card:hover {
  border-color: color-mix(in srgb, var(--ui-primary) 25%, transparent);
  box-shadow: 0 2px 4px color-mix(in srgb, var(--ui-primary) 6%, transparent), 0 12px 32px color-mix(in srgb, var(--ui-primary) 10%, transparent);
  transform: translateY(-3px);
}

.course-card:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 3px;
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.course-card:hover .cover img {
  transform: scale(1.03);
}

.cover-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

.body {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px 22px 22px;
}

.org {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}

h3 {
  margin: 0 0 8px;
  font-size: 1.12rem;
  letter-spacing: -0.01em;
}

.description {
  margin: 0 0 20px;
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
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--ui-border);
}

.price {
  font-weight: 700;
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}

.soon {
  font-size: 0.95rem;
  font-weight: 500;
}

.pacing {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

/* Featured: image beside the text on wide screens. */
@media (min-width: 768px) {
  .featured {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
  }

  .featured .cover {
    aspect-ratio: auto;
    min-height: 100%;
  }

  .featured .body {
    padding: 32px;
  }

  .featured h3 {
    font-size: clamp(1.4rem, 2.2vw, 1.75rem);
    line-height: 1.15;
    margin-bottom: 12px;
  }

  .featured .description {
    font-size: 1.02rem;
    -webkit-line-clamp: 4;
  }

  .featured .price {
    font-size: 1.35rem;
  }
}
</style>
