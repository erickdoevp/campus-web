<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Nuevo curso · Administración', robots: 'noindex' })

const pending = ref(false)
const errors = ref<CmsErrors>()

async function create(input: ProductInput, image: File | null) {
  pending.value = true
  errors.value = undefined
  let product: Product
  try {
    product = await $fetch<Product>('/api/admin/products', { method: 'POST', body: input })
  }
  catch (error) {
    errors.value = cmsErrors(error)
    pending.value = false
    return
  }
  // The draft exists now; an image problem is reported on its page.
  let imageFailed = false
  if (image) {
    try {
      await uploadProductImage(product.id, image)
    }
    catch {
      imageFailed = true
    }
  }
  await navigateTo({ path: `/admin/cursos/${product.id}`, query: { nuevo: imageFailed ? 'sin-imagen' : '1' } })
}
</script>

<template>
  <div class="section container narrow">
    <NuxtLink to="/admin" class="back-link">← Cursos</NuxtLink>
    <h1>Nuevo curso</h1>
    <p class="muted lead">
      Se guarda como borrador. Después lo creas en Open edX para que los autores armen el contenido, y lo pones a la venta cuando esté listo.
    </p>
    <ProductForm submit-label="Guardar borrador" :pending="pending" :errors="errors" @submit="create" />
  </div>
</template>

<style scoped>
.narrow {
  max-width: 860px;
}

h1 {
  margin: 20px 0 8px;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  letter-spacing: -0.03em;
}

.lead {
  margin: 0 0 28px;
  max-width: 62ch;
}
</style>
