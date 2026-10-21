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

// Our /comprar route handles login, asks the CMS for a Stripe checkout and
// redirects there. If the user already owns the course it sends them into it.
const buyUrl = `/comprar/${encodeURIComponent(id)}`
const cancelled = computed(() => route.query.payment === 'cancelled')
const unavailable = computed(() => route.query.payment === 'unavailable')

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

const paragraphs = computed(() => course.value!.description.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean))

const facts = computed(() => [
  { label: 'Modalidad', value: course.value!.pacing === 'self' ? 'A tu ritmo' : 'Con fechas del instructor' },
  { label: 'Inicio', value: course.value!.startDisplay },
  { label: 'Dedicación', value: course.value!.effort },
  { label: 'Acceso', value: 'De por vida' },
].filter(fact => fact.value))

// On small screens a bottom bar keeps the purchase button reachable once
// the purchase card has scrolled out of view.
const purchaseCard = ref<HTMLElement>()
const cardVisible = ref(true)
let observer: IntersectionObserver | undefined
onMounted(() => {
  if (!purchaseCard.value) return
  observer = new IntersectionObserver(([entry]) => { cardVisible.value = entry!.isIntersecting })
  observer.observe(purchaseCard.value)
})
onBeforeUnmount(() => observer?.disconnect())
const showBuyBar = computed(() => !cardVisible.value && !owned.value && course.value!.purchasable)
</script>

<template>
  <div v-if="course" class="container course-layout">
    <header class="intro">
      <NuxtLink to="/cursos" class="back-link rise">← Todos los cursos</NuxtLink>
      <p class="org rise" style="--i: 1">{{ course.org }} <span class="muted">/ {{ course.number }}</span></p>
      <h1 class="rise" style="--i: 2">{{ course.name }}</h1>
      <p v-if="course.shortDescription" class="lead rise" style="--i: 3">{{ course.shortDescription }}</p>
      <dl class="facts rise" style="--i: 4">
        <div v-for="fact in facts" :key="fact.label">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>
    </header>

    <aside class="purchase-slot">
      <div ref="purchaseCard" class="purchase rise" style="--i: 3">
        <div class="purchase-media">
          <img v-if="course.image" :src="course.image" alt="">
        </div>
        <div class="purchase-body">
          <div v-if="unavailable" class="notice notice-warning" role="status">
            No se pudo iniciar el pago. Intenta de nuevo en un momento.
          </div>
          <div v-if="cancelled" class="notice notice-warning" role="status">
            El pago se canceló. Puedes intentarlo de nuevo cuando quieras.
          </div>
          <div v-if="paid && owned" class="notice notice-success" role="status">
            ¡Gracias por tu compra! Ya puedes empezar el curso.
          </div>
          <div v-else-if="paid && confirming" class="notice notice-info" role="status">
            Pago recibido. Estamos activando tu acceso…
          </div>
          <div v-else-if="paid" class="notice notice-info" role="status">
            Pago recibido. Tu acceso puede tardar unos minutos en activarse; recarga la página en un momento.
          </div>

          <template v-if="owned">
            <p class="owned">Ya tienes acceso a este curso.</p>
            <a :href="courseUrl" class="btn btn-primary buy">Ir al curso</a>
          </template>
          <template v-else-if="course.purchasable">
            <p class="price">{{ formatPrice(course.price, course.currency) }}</p>
            <p class="muted terms">Pago único, sin suscripción.</p>
            <a :href="buyUrl" class="btn btn-primary buy">Comprar curso</a>
            <p class="muted note">Si ya lo compraste, te llevaremos directo al curso.</p>
          </template>
          <template v-else>
            <p class="price soon">No disponible</p>
            <p class="muted terms">Este curso ya no está a la venta.</p>
          </template>
        </div>
      </div>
    </aside>

    <!-- Plain text from the CMS, so no HTML is injected into the page. -->
    <section v-if="paragraphs.length" class="overview">
      <div class="prose">
        <p v-for="(paragraph, i) in paragraphs" :key="i">{{ paragraph }}</p>
      </div>
    </section>

    <Transition name="bar">
      <div v-if="showBuyBar" class="buy-bar">
        <span class="price">{{ formatPrice(course.price, course.currency) }}</span>
        <a :href="buyUrl" class="btn btn-primary">Comprar curso</a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.course-layout {
  display: grid;
  gap: 0 48px;
  isolation: isolate;
}

/* Tinted band behind the intro; spills past the container on both sides. */
.intro {
  position: relative;
  padding: 32px 0 40px;
}

.intro::before {
  content: '';
  position: absolute;
  inset: 0 -100vw;
  z-index: -1;
  background:
    radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--brand-accent) 9%, transparent), transparent 45%),
    linear-gradient(180deg, var(--ui-color-primary-100), var(--ui-bg-muted));
  border-bottom: 1px solid var(--ui-border);
}

.back-link {
  margin-bottom: 28px;
}

.org {
  margin: 0 0 12px;
  font-weight: 600;
  color: var(--ui-primary);
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(2rem, 4.4vw, 3rem);
  letter-spacing: -0.03em;
  line-height: 1.08;
  max-width: 20ch;
}

.lead {
  margin: 0 0 32px;
  font-size: 1.15rem;
  color: var(--ui-text-muted);
  max-width: 58ch;
}

.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 24px;
  margin: 0;
}

@media (min-width: 640px) {
  .facts {
    grid-template-columns: repeat(auto-fit, minmax(140px, max-content));
    gap: 0;
  }

  .facts > div {
    padding: 0 28px;
    border-left: 1px solid color-mix(in srgb, var(--ui-primary) 18%, transparent);
  }

  .facts > div:first-child {
    padding-left: 0;
    border-left: 0;
  }
}

.facts dt {
  margin-bottom: 2px;
  font-size: 0.82rem;
  color: var(--ui-text-muted);
}

.facts dd {
  margin: 0;
  font-weight: 600;
}

.purchase-slot {
  padding: 24px 0 8px;
}

.purchase {
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  overflow: hidden;
  box-shadow: 0 2px 4px color-mix(in srgb, var(--ui-primary) 5%, transparent), 0 18px 48px color-mix(in srgb, var(--ui-primary) 10%, transparent);
}

.purchase-media {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, var(--ui-color-primary-100), var(--ui-color-primary-50));
}

.purchase-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.purchase-body {
  padding: 24px;
}

.price {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.price.soon {
  font-size: 1.5rem;
}

.terms {
  margin: 6px 0 0;
  font-size: 0.92rem;
}

.owned {
  margin: 0;
  font-weight: 600;
}

.buy {
  width: 100%;
  margin: 20px 0 12px;
  padding-top: 14px;
  padding-bottom: 14px;
}

.note {
  margin: 0;
  font-size: 0.85rem;
  text-align: center;
}

.overview {
  padding: 40px 0 24px;
}

/* Single line breaks typed in the CMS are kept. */
.overview p {
  white-space: pre-line;
}

@media (min-width: 960px) {
  .course-layout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }

  .intro {
    grid-column: 1;
    grid-row: 1;
    padding: 40px 0 56px;
  }

  .purchase-slot {
    grid-column: 2;
    grid-row: 1 / span 2;
    padding-top: 96px;
  }

  .purchase {
    position: sticky;
    top: 92px;
  }

  .overview {
    grid-column: 1;
    grid-row: 2;
    padding-top: 48px;
  }
}

/* Open edX "About" markup: about / prerequisites / course-staff / faq sections. */
.overview :deep(h2) {
  margin: 40px 0 12px;
  font-size: 1.45rem;
  letter-spacing: -0.02em;
}

.overview :deep(.prose > :first-child),
.overview :deep(section:first-child > h2:first-child) {
  margin-top: 0;
}

.overview :deep(h3) {
  margin: 28px 0 8px;
  font-size: 1.1rem;
}

.overview :deep(p),
.overview :deep(li) {
  color: var(--ui-text);
}

.overview :deep(ul) {
  padding-left: 1.2em;
}

.overview :deep(li + li) {
  margin-top: 6px;
}

.overview :deep(img) {
  border-radius: var(--brand-radius-sm);
}

.overview :deep(.teacher) {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 4px 16px;
  align-items: start;
  margin-top: 20px;
}

.overview :deep(.teacher-image) {
  grid-row: span 2;
}

.overview :deep(.teacher-image img) {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
}

.overview :deep(.teacher h3) {
  margin: 4px 0 0;
}

.overview :deep(.teacher p) {
  margin: 0;
}

.buy-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--ui-bg) 94%, transparent);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--ui-border);
}

.buy-bar .price {
  font-size: 1.35rem;
}

@media (min-width: 960px) {
  .buy-bar {
    display: none;
  }
}

.bar-enter-active,
.bar-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.bar-enter-from,
.bar-leave-to {
  transform: translateY(100%);
}

@media (prefers-reduced-motion: reduce) {
  .bar-enter-active,
  .bar-leave-active {
    transition: none;
  }
}
</style>
