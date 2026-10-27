<script setup lang="ts">
/** A title with a "Renombrar" button that turns it into a small form. */
const props = defineProps<{
  title: string
  /** Saves the new title; throw to keep the form open. */
  save: (title: string) => Promise<unknown>
  tag?: string
}>()

const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const input = ref<HTMLInputElement>()

async function start() {
  draft.value = props.title
  editing.value = true
  await nextTick()
  input.value?.select()
}

async function submit() {
  const title = draft.value.trim()
  if (!title || title === props.title) {
    editing.value = false
    return
  }
  saving.value = true
  try {
    await props.save(title)
    editing.value = false
  }
  catch {
    // The caller already reported the error; let the user retry.
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form v-if="editing" class="rename" @submit.prevent="submit" @keydown.esc="editing = false">
    <input ref="input" v-model="draft" type="text" maxlength="255" aria-label="Nuevo nombre" :disabled="saving">
    <button type="submit" class="btn btn-primary btn-small" :disabled="saving">Guardar</button>
    <button type="button" class="btn btn-secondary btn-small" :disabled="saving" @click="editing = false">Cancelar</button>
  </form>
  <span v-else class="title-line">
    <component :is="tag ?? 'span'" class="title">{{ title }}</component>
    <button type="button" class="link-button" @click="start">Renombrar</button>
  </span>
</template>

<style scoped>
.rename {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.rename input {
  flex: 1 1 220px;
  padding: 8px 12px;
}

.title-line {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  min-width: 0;
}

.title {
  margin: 0;
  overflow-wrap: anywhere;
}
</style>
