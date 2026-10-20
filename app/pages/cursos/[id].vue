<script setup lang="ts">
const route = useRoute()
const config = useRuntimeConfig()
const id = route.params.id as string

const { data: course, error } = await useFetch(`/api/courses/${encodeURIComponent(id)}`)
if (error.value || !course.value) {
  throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado', fatal: true })
}

useSeoMeta({
  title: course.value.name,
  description: course.value.shortDescription,
  ogImage: course.value.image ?? undefined,
})

// The LMS handles login, creates the order and redirects to Stripe.
// If the user already owns the course it sends them straight into it.
const buyUrl = `${config.public.lmsUrl}/payments/buy/${encodeURIComponent(id)}/`
const cancelled = computed(() => route.query.payment === 'cancelled')

const user = useEdxUser()
const { data: ownership, refresh: refreshOwnership } = await useFetch(`/api/courses/${encodeURIComponent(id)}/owned`, {
  immediate: !!user.value,
  default: () => ({ owned: false }),
})
const owned = computed(() => !!user.value && ownership.value.owned)

// Stripe redirects here right after paying, but access is granted by the
// webhook, which may land a few seconds later: keep checking for a while.
const paid = computed(() => route.query.payment === 'success')
const confirming = ref(false)
onMounted(async () => {
  if (!paid.value || !user.value || owned.value) return
  confirming.value = true
  for (let attempt = 0; attempt < 15 && !owned.value; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    await refreshOwnership()
  }
  confirming.value = false
})
const courseUrl = `${config.public.learningMfeUrl}/course/${encodeURIComponent(id)}/home`
</script>

<template>
  <div v-if="course">
    <section class="course-hero">
      <div class="container hero-grid">
        <div>
          <p class="eyebrow">{{ course.org }} · {{ course.number }}</p>
          <h1>{{ course.name }}</h1>
          <p v-if="course.shortDescription" class="lead muted">{{ course.shortDescription }}</p>
          <ul class="facts">
            <li>{{ course.pacing === 'self' ? 'A tu ritmo' : 'Con fechas del instructor' }}</li>
            <li v-if="course.startDisplay">Inicio: {{ course.startDisplay }}</li>
            <li v-if="course.effort">Dedicación: {{ course.effort }}</li>
            <li>Acceso de por vida</li>
          </ul>
        </div>

        <aside class="card purchase">
          <img v-if="course.image" :src="course.image" alt="" class="purchase-image">
          <div class="purchase-body">
            <div v-if="cancelled" class="notice notice-warning">
              El pago se canceló. Puedes intentarlo de nuevo cuando quieras.
            </div>
            <div v-if="paid && owned" class="notice notice-success">
              ¡Gracias por tu compra! Ya puedes empezar el curso.
            </div>
            <div v-else-if="paid && confirming" class="notice notice-info">
              Pago recibido. Estamos activando tu acceso…
            </div>
            <div v-else-if="paid" class="notice notice-info">
              Pago recibido. Tu acceso puede tardar unos minutos en activarse; recarga la página en un momento.
            </div>
            <template v-if="owned">
              <p class="muted">Ya tienes acceso a este curso.</p>
              <a :href="courseUrl" class="btn btn-primary buy">Ir al curso</a>
            </template>
            <template v-else-if="course.purchasable">
              <p class="price">{{ formatPrice(course.price, course.currency) }}</p>
              <p class="muted small">Pago único · acceso de por vida</p>
              <a :href="buyUrl" class="btn btn-primary buy">Comprar curso</a>
              <p class="muted small">Si ya lo compraste, te llevaremos directo al curso.</p>
            </template>
            <p v-else class="muted">Este curso todavía no está a la venta.</p>
          </div>
        </aside>
      </div>
    </section>

    <!-- Overview HTML is authored by staff in Studio. -->
    <section v-if="course.overview" class="section container">
      <div class="prose overview" v-html="course.overview" />
    </section>
  </div>
</template>

<style scoped>
.course-hero {
  padding: 56px 0;
  border-bottom: 1px solid var(--color-border);
}

.hero-grid {
  display: grid;
  gap: 32px;
}

@media (min-width: 900px) {
  .hero-grid {
    grid-template-columns: 1fr 360px;
    align-items: start;
  }
}

h1 {
  margin: 0 0 12px;
  font-size: clamp(1.9rem, 4vw, 2.8rem);
}

.lead {
  font-size: 1.1rem;
  margin: 0 0 20px;
}

.facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.facts li {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.9rem;
}

.purchase {
  box-shadow: var(--shadow);
}

.purchase-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}

.purchase-body {
  padding: 24px;
}

.price {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

.small {
  font-size: 0.85rem;
  margin: 4px 0 0;
}

.buy {
  width: 100%;
  margin: 20px 0 8px;
}

.overview :deep(img) {
  border-radius: var(--radius-sm);
}
</style>
