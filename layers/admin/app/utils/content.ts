/** URL of the course content API, e.g. contentApi(key, '/publish'). */
export function contentApi(courseKey: string, path = '') {
  return `/api/admin/content/${encodeURIComponent(courseKey)}${path}`
}

/** Human message of an error from the content API ($fetch, useFetch or uploadVideo). */
export function apiErrorMessage(error: unknown, fallback = 'Algo salió mal. Intenta de nuevo.') {
  const data = (error as { data?: { message?: string, statusMessage?: string } } | null)?.data
  return data?.message || data?.statusMessage || fallback
}

/** Suggested course code from its name: "Excel avanzado" → "EXCEL-AVANZADO". */
export function courseNumberFrom(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '')
    .toUpperCase()
}

export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('es-MX', { maximumFractionDigits: unit ? 1 : 0 })} ${units[unit]}`
}

/**
 * PUTs a video file to the content API. Uses XMLHttpRequest because fetch
 * can't report upload progress. Errors look like $fetch's ({ data }), so
 * apiErrorMessage() reads both.
 */
export function uploadVideo(url: string, file: File, onProgress: (fraction: number) => void, signal: AbortSignal) {
  return new Promise<ContentVideo>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('content-type', file.type)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject({ data: xhr.response }))
    xhr.onerror = () => reject({ data: { message: 'Se perdió la conexión durante la subida.' } })
    xhr.onabort = () => reject(new DOMException('Subida cancelada', 'AbortError'))
    signal.addEventListener('abort', () => xhr.abort())
    xhr.send(file)
  })
}

/** Studio page of a unit, where the components Campus doesn't edit are edited. */
export function studioUnitUrl(studioUrl: string, unitId: string) {
  return `${studioUrl.replace(/\/$/, '')}/container/${unitId}`
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  'html': 'Texto',
  'discussion': 'Foro',
  'library_content': 'Biblioteca',
  'drag-and-drop-v2': STUDIO_EVALUATION_KINDS.drag_and_drop.label,
  'openassessment': STUDIO_EVALUATION_KINDS.open_response.label,
}

export function blockTypeLabel(blockType: string) {
  return BLOCK_TYPE_LABELS[blockType] ?? blockType
}

/**
 * Reads the OLX of a problem written by Campus or by Studio's simple editor
 * into the form Campus edits. Null when it has anything Campus can't keep
 * (several questions, hints, scripts, other response types...): those are
 * edited in Studio, so nothing is lost. Browser only (DOMParser).
 */
export function parseEvaluation(evaluation: ContentEvaluation): EvaluationInput | null {
  if (!evaluation.olx || import.meta.server) return null
  const doc = new DOMParser().parseFromString(evaluation.olx, 'application/xml')
  const root = doc.documentElement
  if (root.nodeName !== 'problem' || doc.getElementsByTagName('parsererror').length) return null

  const responses = Array.from(root.children).filter(el => el.nodeName.endsWith('response'))
  const response = responses[0]
  if (responses.length !== 1 || !response) return null
  // Text around the response other than plain paragraphs (scripts, images, tables...) stays in Studio.
  if (Array.from(root.children).some(el => el !== response && el.nodeName !== 'p' && el.nodeName !== 'label')) return null

  // Settings Campus doesn't show (partial credit, shuffling...) stay in Studio too.
  const RESPONSE_ATTRIBUTES: Record<string, string[]> = { numericalresponse: ['answer'], stringresponse: ['answer', 'type'] }
  if (Array.from(response.attributes).some(attr => !(RESPONSE_ATTRIBUTES[response.nodeName] ?? []).includes(attr.name))) return null

  const label = response.querySelector(':scope > label')
  const paragraphs = Array.from(root.children).filter(el => el.nodeName === 'p')
  // Either the question is the label (Campus, Studio's editor) or paragraphs before the response, not both.
  if (label && paragraphs.length) return null
  const question = (label?.textContent ?? paragraphs.map(p => p.textContent).join('\n\n')).trim()
  const solution = response.querySelector(':scope > solution') ?? root.querySelector(':scope > solution')
  const explanation = solution
    ? Array.from(solution.querySelectorAll('p')).map(p => p.textContent?.trim() ?? '')
        .filter((text, i) => text && !(i === 0 && /^explicaci[oó]n$|^explanation$/i.test(text))).join('\n\n')
    : ''
  const settings = {
    title: evaluation.title,
    maxAttempts: evaluation.maxAttempts,
    weight: evaluation.weight ?? 1,
    showAnswer: evaluation.showAnswer ?? 'finished',
    question,
    explanation,
  }
  const allowed = (el: Element, names: string[]) => Array.from(el.children).every(child => names.includes(child.nodeName))
  const plain = (el: Element) => el.children.length === 0 && Array.from(el.attributes).every(attr => attr.name === 'correct')
  const choicesOf = (els: Element[], correct: (el: Element) => boolean) =>
    els.every(plain) ? els.map(el => ({ text: el.textContent?.trim() ?? '', correct: correct(el) })) : null

  switch (response.nodeName) {
    case 'multiplechoiceresponse':
    case 'choiceresponse': {
      const group = response.querySelector(':scope > choicegroup, :scope > checkboxgroup')
      if (!group || !allowed(response, ['label', 'choicegroup', 'checkboxgroup', 'solution'])) return null
      const choices = choicesOf(Array.from(group.children), el => el.getAttribute('correct') === 'true')
      if (!choices || !allowed(group, ['choice'])) return null
      return { ...settings, kind: response.nodeName === 'choiceresponse' ? 'checkboxes' : 'multiple_choice', choices }
    }
    case 'optionresponse': {
      const input = response.querySelector(':scope > optioninput')
      if (!input || !allowed(response, ['label', 'optioninput', 'solution']) || !allowed(input, ['option'])) return null
      const choices = choicesOf(Array.from(input.children), el => el.getAttribute('correct')?.toLowerCase() === 'true')
      return choices && { ...settings, kind: 'dropdown', choices }
    }
    case 'numericalresponse': {
      if (!allowed(response, ['label', 'responseparam', 'formulaequationinput', 'textline', 'solution'])) return null
      const tolerance = response.querySelector(':scope > responseparam[type="tolerance"]')?.getAttribute('default') ?? ''
      return { ...settings, kind: 'numerical', answer: response.getAttribute('answer') ?? '', tolerance }
    }
    case 'stringresponse': {
      if (!allowed(response, ['label', 'additional_answer', 'textline', 'solution'])) return null
      const type = response.getAttribute('type') ?? ''
      if (type.includes('regexp')) return null
      const answers = [response.getAttribute('answer') ?? '', ...Array.from(response.querySelectorAll(':scope > additional_answer')).map(a => a.getAttribute('answer') ?? '')]
      return { ...settings, kind: 'text', answers, caseSensitive: !type.includes('ci') }
    }
  }
  return null
}

/** ISO date-time → "YYYY-MM-DD" in Mexico City, for <input type="date">. */
export function toDateInput(iso: string | null) {
  return toLocalInput(iso).slice(0, 10)
}

/** "YYYY-MM-DD" → midnight in Mexico City, as ISO; null when empty. */
export function fromDateInput(date: string) {
  return date ? fromLocalInput(`${date}T00:00`) : null
}
