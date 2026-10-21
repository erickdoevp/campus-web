<script setup lang="ts">
/**
 * One headline number: label, value and, optionally, the change vs the
 * previous period. The change's color says whether it's good news, and an
 * arrow and the word carry it too (never color alone).
 */
const props = withDefaults(defineProps<{
  label: string
  value: string
  /** % change vs the previous period; null = nothing to compare with. */
  change?: number | null
  /** For refunds, going up is bad news. */
  upIsGood?: boolean
  hint?: string
  hero?: boolean
}>(), { change: undefined, upIsGood: true, hint: '', hero: false })

const delta = computed(() => {
  if (props.change === undefined) return null
  if (props.change === null) return { text: 'Sin periodo anterior para comparar', tone: 'neutral', arrow: '' }
  const rounded = Math.round(props.change)
  if (rounded === 0) return { text: 'Igual que el periodo anterior', tone: 'neutral', arrow: '=' }
  const up = rounded > 0
  return {
    text: `${up ? 'Sube' : 'Baja'} ${Math.abs(rounded)}% vs el periodo anterior`,
    tone: up === props.upIsGood ? 'good' : 'bad',
    arrow: up ? '▲' : '▼',
  }
})
</script>

<template>
  <div class="tile" :class="{ hero }">
    <p class="label">{{ label }}</p>
    <p class="value">{{ value }}</p>
    <p v-if="delta" class="delta" :class="`delta-${delta.tone}`">
      <span v-if="delta.arrow" aria-hidden="true">{{ delta.arrow }}</span>
      {{ delta.text }}
    </p>
    <p v-if="hint" class="hint muted">{{ hint }}</p>
  </div>
</template>

<style scoped>
.tile {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius);
  background: var(--ui-bg);
  /* The value scales with the tile, so a long amount never breaks across lines. */
  container-type: inline-size;
}

.label {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--ui-text-muted);
}

.value {
  margin: 0;
  font-size: clamp(1.05rem, 14cqi, 1.6rem);
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--ui-text-highlighted);
  white-space: nowrap;
}

.hero .value {
  font-size: clamp(1.8rem, 15cqi, 3.2rem);
  letter-spacing: -0.03em;
}

.delta,
.hint {
  margin: 0;
  font-size: 0.82rem;
}

.delta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.delta-good {
  color: var(--ui-color-success-700);
}

.delta-bad {
  color: var(--ui-color-error-700);
}

.delta-neutral {
  color: var(--ui-text-muted);
}
</style>
