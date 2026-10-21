<script setup lang="ts">
const props = defineProps<{ status: ProductStatus }>()
const label = computed(() => PRODUCT_STATUS[props.status].label)
</script>

<template>
  <span class="status" :class="`status-${status}`">{{ label }}</span>
</template>

<style scoped>
.status {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-draft {
  background: var(--ui-color-neutral-100);
  color: var(--ui-color-neutral-700);
}

.status-created {
  background: var(--ui-color-primary-100);
  color: var(--ui-color-primary-700);
}

.status-on_sale {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-800);
}

.status-archived {
  background: var(--ui-color-warning-50);
  color: var(--ui-color-warning-800);
}
</style>
