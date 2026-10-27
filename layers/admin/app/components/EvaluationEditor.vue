<script setup lang="ts">
/**
 * Form for an evaluation Campus writes: the question, its answers, an
 * optional explanation, and how it's graded (points, attempts, when the
 * answer is shown). Validated with the same rules as the server.
 */
const props = defineProps<{
  /** The evaluation to edit, or a new one of this kind. */
  initial: EvaluationInput | EvaluationKind
  saving?: boolean
}>()
const emit = defineEmits<{ save: [input: EvaluationInput], cancel: [] }>()

function blank(kind: EvaluationKind): EvaluationInput {
  const settings = { title: EVALUATION_KINDS[kind].label, question: '', explanation: '', maxAttempts: 1, weight: 1, showAnswer: 'finished' as ShowAnswer }
  switch (kind) {
    case 'numerical':
      return { ...settings, kind, answer: '', tolerance: '' }
    case 'text':
      return { ...settings, kind, answers: [''], caseSensitive: false }
    default:
      return { ...settings, kind, choices: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }] }
  }
}

// A deep copy, so cancelling leaves the original as it was.
const form = reactive<EvaluationInput>(typeof props.initial === 'string' ? blank(props.initial) : structuredClone(toRaw(props.initial)))
const uid = useId()
const kindInfo = computed(() => EVALUATION_KINDS[form.kind])

// "Unlimited" is an empty attempts field.
const attempts = computed({
  get: () => form.maxAttempts ?? '',
  set: (value: number | string) => { form.maxAttempts = value === '' || value == null ? null : Number(value) },
})

function markCorrect(index: number) {
  if (form.kind !== 'multiple_choice' && form.kind !== 'checkboxes' && form.kind !== 'dropdown') return
  if (form.kind === 'checkboxes') {
    form.choices[index]!.correct = !form.choices[index]!.correct
  }
  else {
    form.choices.forEach((choice, i) => { choice.correct = i === index })
  }
}

const error = ref('')
function submit() {
  const problem = evaluationProblem(form)
  error.value = problem ?? ''
  if (!problem) emit('save', structuredClone(toRaw(form)))
}
</script>

<template>
  <form class="evaluation-editor" novalidate @submit.prevent="submit">
    <p class="editor-kind">
      <span class="badge">{{ kindInfo.label }}</span>
      <span class="muted">{{ kindInfo.hint }}</span>
    </p>

    <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

    <div class="field">
      <label :for="`${uid}-title`">Nombre</label>
      <input :id="`${uid}-title`" v-model="form.title" type="text" maxlength="255" required>
      <p class="field-hint">Así aparece en el temario y en las calificaciones del alumno.</p>
    </div>

    <div class="field">
      <label :for="`${uid}-question`">Pregunta</label>
      <textarea :id="`${uid}-question`" v-model="form.question" rows="3" maxlength="5000" required placeholder="¿Qué cuenta registra los ingresos por ventas?" />
    </div>

    <fieldset v-if="form.kind === 'multiple_choice' || form.kind === 'checkboxes' || form.kind === 'dropdown'" class="field answers">
      <legend>Opciones <span class="muted">· {{ form.kind === 'checkboxes' ? 'marca todas las correctas' : 'marca la correcta' }}</span></legend>
      <div v-for="(choice, i) in form.choices" :key="i" class="answer-row" :class="{ correct: choice.correct }">
        <input
          :type="form.kind === 'checkboxes' ? 'checkbox' : 'radio'"
          :name="`${uid}-correct`"
          :checked="choice.correct"
          :aria-label="`Opción ${i + 1} correcta`"
          @change="markCorrect(i)"
        >
        <input v-model="choice.text" type="text" maxlength="500" :placeholder="`Opción ${i + 1}`" :aria-label="`Texto de la opción ${i + 1}`">
        <button type="button" class="link-button danger" :disabled="form.choices.length <= 2" @click="form.choices.splice(i, 1)">Quitar</button>
      </div>
      <button v-if="form.choices.length < MAX_CHOICES" type="button" class="link-button add" @click="form.choices.push({ text: '', correct: false })">+ Agregar opción</button>
    </fieldset>

    <div v-else-if="form.kind === 'numerical'" class="field-row">
      <div class="field">
        <label :for="`${uid}-answer`">Respuesta correcta</label>
        <input :id="`${uid}-answer`" v-model="form.answer" type="text" inputmode="decimal" placeholder="1250.50" required>
      </div>
      <div class="field">
        <label :for="`${uid}-tolerance`">Tolerancia <span class="muted">(opcional)</span></label>
        <input :id="`${uid}-tolerance`" v-model="form.tolerance" type="text" placeholder="5% o 0.5">
        <p class="field-hint">Cuánto puede alejarse la respuesta y seguir siendo correcta.</p>
      </div>
    </div>

    <fieldset v-else-if="form.kind === 'text'" class="field answers">
      <legend>Respuestas aceptadas</legend>
      <div v-for="(_, i) in form.answers" :key="i" class="answer-row">
        <input v-model="form.answers[i]" type="text" maxlength="255" :placeholder="i ? 'Otra forma de escribirla' : 'Respuesta correcta'" :aria-label="`Respuesta aceptada ${i + 1}`">
        <button type="button" class="link-button danger" :disabled="form.answers.length <= 1" @click="form.answers.splice(i, 1)">Quitar</button>
      </div>
      <button v-if="form.answers.length < MAX_CHOICES" type="button" class="link-button add" @click="form.answers.push('')">+ Otra respuesta aceptada</button>
      <label class="check">
        <input v-model="form.caseSensitive" type="checkbox">
        Distinguir mayúsculas y minúsculas
      </label>
    </fieldset>

    <div class="field">
      <label :for="`${uid}-explanation`">Explicación <span class="muted">(opcional)</span></label>
      <textarea :id="`${uid}-explanation`" v-model="form.explanation" rows="3" maxlength="5000" placeholder="Por qué esa es la respuesta correcta." />
      <p class="field-hint">Se muestra junto con la respuesta correcta. Separa los párrafos con una línea en blanco.</p>
    </div>

    <div class="field-row">
      <div class="field">
        <label :for="`${uid}-weight`">Puntos</label>
        <input :id="`${uid}-weight`" v-model.number="form.weight" type="number" min="0" max="1000" step="any" inputmode="decimal">
      </div>
      <div class="field">
        <label :for="`${uid}-attempts`">Intentos</label>
        <input :id="`${uid}-attempts`" v-model="attempts" type="number" min="1" max="100" step="1" inputmode="numeric" placeholder="Ilimitados">
      </div>
      <div class="field">
        <label :for="`${uid}-show`">Mostrar la respuesta</label>
        <select :id="`${uid}-show`" v-model="form.showAnswer">
          <option v-for="(label, value) in SHOW_ANSWER" :key="value" :value="value">{{ label }}</option>
        </select>
      </div>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary btn-small" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar evaluación' }}</button>
      <button type="button" class="btn btn-secondary btn-small" :disabled="saving" @click="emit('cancel')">Cancelar</button>
    </div>
  </form>
</template>

<style scoped>
.evaluation-editor {
  padding: 18px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
}

.editor-kind {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin: 0 0 16px;
  font-size: 0.9rem;
}

.answers {
  margin-inline: 0;
  padding: 0;
  border: 0;
}

.answers legend {
  margin-bottom: 8px;
  padding: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.answers legend .muted {
  font-weight: 400;
}

.answer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: var(--brand-radius-sm);
}

.answer-row + .answer-row {
  margin-top: 6px;
}

.answer-row.correct {
  background: var(--ui-color-success-50);
}

.answer-row input[type='text'] {
  flex: 1;
  min-width: 0;
}

.answer-row input[type='radio'],
.answer-row input[type='checkbox'],
.check input {
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  flex: none;
  accent-color: var(--ui-color-success-600);
}

.add {
  margin-top: 10px;
  color: var(--ui-primary);
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-weight: 500;
  cursor: pointer;
}

.link-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.form-actions {
  margin-top: 20px;
}
</style>
