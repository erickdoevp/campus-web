<script setup lang="ts">
/** Date range for the dashboard: presets first, custom range after. Days are Mexico City days. */
const model = defineModel<{ from: string, to: string }>({ required: true })

const presets = computed(() => {
  const today = todayInMexico()
  const [year, month] = today.split('-')
  return [
    { id: '7', label: '7 días', from: addDays(today, -6), to: today },
    { id: '30', label: '30 días', from: addDays(today, -29), to: today },
    { id: '90', label: '90 días', from: addDays(today, -89), to: today },
    { id: 'month', label: 'Este mes', from: `${year}-${month}-01`, to: today },
    { id: 'year', label: 'Este año', from: `${year}-01-01`, to: today },
  ]
})
const active = computed(() => presets.value.find(p => p.from === model.value.from && p.to === model.value.to)?.id)

const custom = reactive({ ...model.value })
watch(model, value => Object.assign(custom, value))
function applyCustom() {
  if (custom.from && custom.to && custom.from <= custom.to) model.value = { ...custom }
}
</script>

<template>
  <div class="range" role="group" aria-label="Periodo">
    <div class="presets">
      <button
        v-for="preset in presets"
        :key="preset.id"
        type="button"
        class="chip"
        :aria-pressed="active === preset.id"
        @click="model = { from: preset.from, to: preset.to }"
      >
        {{ preset.label }}
      </button>
    </div>
    <form class="custom" @submit.prevent="applyCustom">
      <label class="visually-hidden" for="range-from">Desde</label>
      <input id="range-from" v-model="custom.from" type="date" :max="custom.to">
      <span class="muted" aria-hidden="true">–</span>
      <label class="visually-hidden" for="range-to">Hasta</label>
      <input id="range-to" v-model="custom.to" type="date" :min="custom.from">
      <button type="submit" class="chip">Aplicar</button>
    </form>
  </div>
</template>

<style scoped>
.range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
}

.presets,
.custom {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.chip {
  padding: 7px 14px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ui-text-highlighted);
  cursor: pointer;
}

.chip[aria-pressed='true'] {
  border-color: var(--ui-primary);
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
}

.custom input {
  width: auto;
  padding: 6px 10px;
  font-size: 0.9rem;
}
</style>
