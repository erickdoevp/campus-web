<script setup lang="ts">
/** Price (the `verified` mode the payments plugin sells) and catalog visibility. */
const props = defineProps<{ course: AdminCourse }>()
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()

const price = ref<number | ''>(props.course.price ?? '')
const visible = ref(props.course.visible)
watch(() => props.course, (course) => {
  price.value = course.price ?? ''
  visible.value = course.visible
})

const invalid = computed(() => typeof price.value === 'number' && (price.value < 0 || !Number.isInteger(price.value)))
const saving = ref(false)
const error = ref('')

async function save() {
  error.value = ''
  if (invalid.value) {
    document.getElementById('sale-price')?.focus()
    return
  }
  saving.value = true
  try {
    const newPrice = typeof price.value === 'number' && price.value > 0 ? price.value : null
    if (newPrice !== props.course.price) {
      await $fetch(adminCourseApi(props.course.id, '/price'), { method: 'PUT', body: { price: newPrice } })
    }
    if (visible.value !== props.course.visible) {
      await $fetch(adminCourseApi(props.course.id), { method: 'PATCH', body: { visible: visible.value } satisfies AdminCourseUpdateInput })
    }
    emit('saved')
    toast.add({ title: 'Venta actualizada', color: 'success' })
  }
  catch (e) {
    error.value = apiErrorMessage(e, 'No se pudo guardar.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="admin-panel" novalidate @submit.prevent="save">
    <h2>Precio y visibilidad</h2>
    <p class="muted panel-intro">
      <template v-if="course.price && course.visible">A la venta en Campus por <strong>{{ formatPrice(course.price, course.currency) }}</strong>.</template>
      <template v-else-if="course.price">Tiene precio, pero está oculto del catálogo.</template>
      <template v-else-if="course.visible">Aparece en el catálogo como “Próximamente”: aún no se puede comprar.</template>
      <template v-else>Oculto del catálogo y sin precio.</template>
      Los cambios se aplican de inmediato.
    </p>

    <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

    <div class="field price-field">
      <label for="sale-price">Precio ({{ course.currency.toUpperCase() }})</label>
      <div class="input-prefix">
        <span aria-hidden="true">$</span>
        <input id="sale-price" v-model.number="price" type="number" min="0" step="1" inputmode="numeric" placeholder="Sin precio" :aria-invalid="invalid">
      </div>
      <p class="field-hint">Pago único con Stripe. Déjalo vacío o en 0 para quitarlo de la venta; quien ya lo compró conserva el acceso.</p>
    </div>

    <div class="field">
      <label class="check">
        <input v-model="visible" type="checkbox">
        <span>
          Mostrar en el catálogo de Campus
          <span class="field-hint">Si lo ocultas, la página del curso sigue funcionando para quien tenga el enlace.</span>
        </span>
      </label>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar' }}</button>
    </div>
  </form>
</template>

<style scoped>
.price-field {
  max-width: 280px;
}

.check {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-weight: 600;
  cursor: pointer;
}

.check input {
  width: 18px;
  height: 18px;
  margin-top: 4px;
  padding: 0;
  flex: none;
  accent-color: var(--ui-primary);
}

.check .field-hint {
  display: block;
  font-weight: 400;
}
</style>
