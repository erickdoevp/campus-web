/**
 * Evaluations: the question types Open edX offers, and the OLX (Open edX's
 * XML) Campus writes for the ones it edits itself. Used by the browser (to
 * validate and describe) and by the server (to validate again and build OLX).
 */

export const EVALUATION_KINDS: Record<EvaluationKind, { label: string, hint: string }> = {
  multiple_choice: { label: 'Opción múltiple', hint: 'Una sola respuesta correcta.' },
  checkboxes: { label: 'Casillas', hint: 'Varias respuestas correctas; hay que marcar todas.' },
  dropdown: { label: 'Lista desplegable', hint: 'Elegir la respuesta correcta de una lista.' },
  numerical: { label: 'Respuesta numérica', hint: 'Un número, con un margen de tolerancia opcional.' },
  text: { label: 'Respuesta de texto', hint: 'Una palabra o frase; puedes aceptar varias.' },
}

/** How each Studio-edited type is created: block type and, for problems, Studio's template. */
export const STUDIO_EVALUATION_KINDS: Record<StudioEvaluationKind, { label: string, hint: string, category: string, boilerplate?: string }> = {
  drag_and_drop: { label: 'Arrastrar y soltar', hint: 'Colocar elementos en zonas de una imagen.', category: 'drag-and-drop-v2' },
  open_response: { label: 'Respuesta abierta', hint: 'Ensayo o entrega, calificada por el equipo, por compañeros o por el propio alumno.', category: 'openassessment' },
  math: { label: 'Expresión matemática', hint: 'Una fórmula que Open edX compara con la correcta.', category: 'problem', boilerplate: 'formularesponse.yaml' },
  image: { label: 'Zona en imagen', hint: 'Hacer clic en la parte correcta de una imagen.', category: 'problem', boilerplate: 'imageresponse.yaml' },
  custom: { label: 'Evaluación con Python', hint: 'Una respuesta revisada por un programa propio.', category: 'problem', boilerplate: 'customgrader.yaml' },
}

export const SHOW_ANSWER: Record<ShowAnswer, string> = {
  finished: 'Cuando acierte o se le acaben los intentos',
  attempted: 'Después de su primer intento',
  past_due: 'Después de la fecha límite',
  never: 'Nunca',
}

/** Default Open edX assignment types, in Spanish; any other name is shown as is. */
const GRADER_LABELS: Record<string, string> = {
  'Homework': 'Tarea',
  'Lab': 'Laboratorio',
  'Midterm Exam': 'Examen parcial',
  'Final Exam': 'Examen final',
  'Exam': 'Examen',
  'Quiz': 'Cuestionario',
}

export function graderLabel(type: string) {
  return GRADER_LABELS[type] ?? type
}

export const MAX_CHOICES = 10

/** What's wrong with an evaluation, in Spanish, or null when it can be saved. */
export function evaluationProblem(input: EvaluationInput): string | null {
  if (!input.title.trim() || input.title.length > 255) return 'Escribe un nombre de hasta 255 caracteres.'
  if (!input.question.trim()) return 'Escribe la pregunta.'
  if (input.question.length > 5000 || input.explanation.length > 5000) return 'La pregunta y la explicación pueden tener hasta 5000 caracteres.'
  if (input.maxAttempts !== null && (!Number.isInteger(input.maxAttempts) || input.maxAttempts < 1 || input.maxAttempts > 100)) {
    return 'Los intentos deben ser un número entero entre 1 y 100, o ilimitados.'
  }
  if (!Number.isFinite(input.weight) || input.weight < 0 || input.weight > 1000) return 'Los puntos deben ser un número entre 0 y 1000.'
  if (!(input.showAnswer in SHOW_ANSWER)) return 'Elige cuándo se muestra la respuesta.'

  switch (input.kind) {
    case 'multiple_choice':
    case 'checkboxes':
    case 'dropdown': {
      const choices = input.choices.filter(c => c.text.trim())
      if (choices.length < 2) return 'Agrega al menos dos opciones.'
      if (input.choices.length > MAX_CHOICES) return `Puede haber hasta ${MAX_CHOICES} opciones.`
      if (choices.some(c => c.text.length > 500)) return 'Cada opción puede tener hasta 500 caracteres.'
      const correct = choices.filter(c => c.correct).length
      if (input.kind === 'checkboxes' ? correct < 1 : correct !== 1) {
        return input.kind === 'checkboxes' ? 'Marca al menos una opción correcta.' : 'Marca exactamente una opción correcta.'
      }
      return null
    }
    case 'numerical':
      if (!Number.isFinite(Number(input.answer)) || !input.answer.trim()) return 'La respuesta correcta debe ser un número, por ejemplo 3.5.'
      if (input.tolerance.trim() && !/^\d+(\.\d+)?%?$/.test(input.tolerance.trim())) return 'La tolerancia es un número (0.5) o un porcentaje (5%).'
      return null
    case 'text': {
      const answers = input.answers.filter(a => a.trim())
      if (!answers.length) return 'Escribe al menos una respuesta aceptada.'
      if (answers.length > MAX_CHOICES || answers.some(a => a.length > 255)) return `Hasta ${MAX_CHOICES} respuestas de hasta 255 caracteres.`
      return null
    }
  }
}

function escapeXml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function solution(explanation: string) {
  const paragraphs = explanation.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  if (!paragraphs.length) return ''
  return [
    '    <solution>',
    '      <div class="detailed-solution">',
    '        <p>Explicación</p>',
    ...paragraphs.map(p => `        <p>${escapeXml(p).replace(/\n/g, '<br/>')}</p>`),
    '      </div>',
    '    </solution>',
  ].join('\n')
}

/** OLX of a "problem" block for a validated input. */
export function evaluationOlx(input: EvaluationQuestion): string {
  const label = `    <label>${escapeXml(input.question.trim())}</label>`
  let body: string[]
  switch (input.kind) {
    case 'multiple_choice':
    case 'checkboxes': {
      const [response, group, groupAttrs] = input.kind === 'checkboxes'
        ? ['choiceresponse', 'checkboxgroup', '']
        : ['multiplechoiceresponse', 'choicegroup', ' type="MultipleChoice"']
      const choices = input.choices.filter(c => c.text.trim())
        .map(c => `      <choice correct="${c.correct}">${escapeXml(c.text.trim())}</choice>`)
      body = [`  <${response}>`, label, `    <${group}${groupAttrs}>`, ...choices, `    </${group}>`, solution(input.explanation), `  </${response}>`]
      break
    }
    case 'dropdown': {
      const options = input.choices.filter(c => c.text.trim())
        .map(c => `      <option correct="${c.correct ? 'True' : 'False'}">${escapeXml(c.text.trim())}</option>`)
      body = ['  <optionresponse>', label, '    <optioninput>', ...options, '    </optioninput>', solution(input.explanation), '  </optionresponse>']
      break
    }
    case 'numerical': {
      const tolerance = input.tolerance.trim()
      body = [
        `  <numericalresponse answer="${escapeXml(input.answer.trim())}">`,
        label,
        ...(tolerance ? [`    <responseparam type="tolerance" default="${escapeXml(tolerance)}"/>`] : []),
        '    <formulaequationinput/>',
        solution(input.explanation),
        '  </numericalresponse>',
      ]
      break
    }
    case 'text': {
      const [first, ...others] = input.answers.map(a => a.trim()).filter(Boolean)
      body = [
        `  <stringresponse answer="${escapeXml(first!)}"${input.caseSensitive ? '' : ' type="ci"'}>`,
        label,
        ...others.map(a => `    <additional_answer answer="${escapeXml(a)}"/>`),
        '    <textline size="40"/>',
        solution(input.explanation),
        '  </stringresponse>',
      ]
      break
    }
  }
  return ['<problem>', ...body.filter(Boolean), '</problem>', ''].join('\n')
}
