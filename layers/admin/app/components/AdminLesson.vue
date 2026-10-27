<script setup lang="ts">
/**
 * One lesson of the outline: its videos and evaluations (in course order),
 * uploads, links, and whether it counts for the grade. The content loads the
 * first time the lesson is opened; new items go to the lesson's last unit.
 */
const props = defineProps<{ courseKey: string, lesson: ContentLesson, number: string, graders: string[] }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()
const config = useRuntimeConfig()

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const MAX_VIDEO_BYTES = 2 * 1024 ** 3

const open = ref(false)
const components = ref<ContentComponent[] | null>(null)
const loading = ref(false)
const loadError = ref('')
const preview = ref<string | null>(null)
// Units created here show up in props only after the parent refreshes.
const unitIds = ref([...props.lesson.unitIds])
watch(() => props.lesson.unitIds, (ids) => { unitIds.value = [...ids] })

const videoCount = computed(() => components.value?.filter(c => c.type === 'video').length ?? 0)
const evaluationCount = computed(() => components.value?.filter(c => c.type === 'evaluation').length ?? 0)

function unitApi(unitId: string, path: string) {
  return contentApi(props.courseKey, `/units/${encodeURIComponent(unitId)}${path}`)
}

function blockApi(id: string) {
  return contentApi(props.courseKey, `/blocks/${encodeURIComponent(id)}`)
}

async function loadComponents() {
  loading.value = true
  loadError.value = ''
  try {
    const perUnit = await Promise.all(unitIds.value.map(id => $fetch<ContentComponent[]>(unitApi(id, '/components'))))
    components.value = perUnit.flat()
  }
  catch (e) {
    loadError.value = apiErrorMessage(e, 'No pudimos cargar el contenido de la lección.')
  }
  finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value && !components.value && !loading.value) loadComponents()
}

function added(component: ContentComponent) {
  components.value = [...(components.value ?? []), component]
  emit('changed')
}

async function targetUnit() {
  const last = unitIds.value.at(-1)
  if (last) return last
  // Lessons made in Studio may have no unit yet.
  const unit = await $fetch<{ id: string }>(contentApi(props.courseKey, '/blocks'), {
    method: 'POST',
    body: { kind: 'unit', parentId: props.lesson.id, title: props.lesson.title } satisfies ContentBlockInput,
  })
  unitIds.value.push(unit.id)
  return unit.id
}

function reportError(e: unknown, fallback: string) {
  toast.add({ title: apiErrorMessage(e, fallback), color: 'error' })
}

// --- grading -------------------------------------------------------------------

const grading = reactive({ format: props.lesson.format ?? '', due: toLocalInput(props.lesson.due) })
watch(() => [props.lesson.format, props.lesson.due], () => {
  grading.format = props.lesson.format ?? ''
  grading.due = toLocalInput(props.lesson.due)
})
const gradingChanged = computed(() => grading.format !== (props.lesson.format ?? '') || (!!grading.format && grading.due !== toLocalInput(props.lesson.due)))
const savingGrading = ref(false)

async function saveGrading() {
  savingGrading.value = true
  try {
    await $fetch(blockApi(props.lesson.id), {
      method: 'PATCH',
      body: { grading: { format: grading.format || null, due: grading.format ? fromLocalInput(grading.due) : null } satisfies LessonGradingInput },
    })
    toast.add({ title: grading.format ? `La lección cuenta como ${graderLabel(grading.format)}` : 'La lección ya no cuenta para la calificación', color: 'success' })
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo guardar la calificación.')
  }
  finally {
    savingGrading.value = false
  }
}

// --- videos --------------------------------------------------------------------

// Uploads run one at a time; the rest wait in line.
interface Upload {
  key: number
  file: File
  title: string
  progress: number
  status: 'waiting' | 'uploading' | 'error'
  error: string
  controller: AbortController
}
const uploads = ref<Upload[]>([])
let uploadKey = 0
let processing = false

function addFiles(files: Iterable<File>) {
  for (const file of files) {
    if (!VIDEO_TYPES.includes(file.type)) {
      toast.add({ title: `“${file.name}” no es MP4, WebM ni Ogg.`, color: 'error' })
    }
    else if (file.size > MAX_VIDEO_BYTES) {
      toast.add({ title: `“${file.name}” pesa más de 2 GB.`, color: 'error' })
    }
    else {
      // File and AbortController break inside Vue proxies (xhr.send, abort()).
      uploads.value.push({
        key: ++uploadKey,
        file: markRaw(file),
        title: file.name.replace(/\.[^.]+$/, '').slice(0, 255) || 'Video',
        progress: 0,
        status: 'waiting',
        error: '',
        controller: markRaw(new AbortController()),
      })
    }
  }
  processUploads()
}

async function processUploads() {
  if (processing) return
  processing = true
  for (;;) {
    const upload = uploads.value.find(u => u.status === 'waiting')
    if (!upload) break
    upload.status = 'uploading'
    try {
      const unitId = await targetUnit()
      const video = await uploadVideo(
        `${unitApi(unitId, '/videos')}?title=${encodeURIComponent(upload.title)}`,
        upload.file,
        (fraction) => { upload.progress = fraction },
        upload.controller.signal,
      )
      uploads.value = uploads.value.filter(u => u !== upload)
      added(video)
    }
    catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        uploads.value = uploads.value.filter(u => u !== upload)
      }
      else {
        upload.status = 'error'
        upload.error = apiErrorMessage(e, 'No se pudo subir el video.')
      }
    }
  }
  processing = false
}

function cancelUpload(upload: Upload) {
  if (upload.status === 'uploading') upload.controller.abort()
  else uploads.value = uploads.value.filter(u => u !== upload)
}

function retryUpload(upload: Upload) {
  upload.status = 'waiting'
  upload.error = ''
  upload.progress = 0
  upload.controller = markRaw(new AbortController())
  processUploads()
}

const dragging = ref(false)
function onDrop(event: DragEvent) {
  dragging.value = false
  if (event.dataTransfer?.files.length) addFiles(event.dataTransfer.files)
}
function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) addFiles(input.files)
  input.value = ''
}

// What the "add" area shows: nothing extra, the link form or the evaluation picker/editor.
const adding = ref<'link' | 'evaluation' | EvaluationKind | null>(null)
const link = reactive({ title: '', url: '' })
const busy = ref(false)

async function addLink() {
  busy.value = true
  try {
    const unitId = await targetUnit()
    added(await $fetch<ContentVideo>(unitApi(unitId, '/videos'), {
      method: 'POST',
      body: { title: link.title || 'Video', url: link.url },
    }))
    link.title = ''
    link.url = ''
    adding.value = null
  }
  catch (e) {
    reportError(e, 'No se pudo agregar el video.')
  }
  finally {
    busy.value = false
  }
}

function sourceLabel(video: ContentVideo) {
  if (video.youtubeId) return 'YouTube'
  if (video.url?.includes('/media/videos/')) return 'Archivo subido'
  return video.url ? 'Enlace externo' : 'Sin fuente'
}

// --- evaluations ---------------------------------------------------------------

const editing = ref<string | null>(null)
// Parsed once per evaluation: null means it's edited in Studio.
const editable = computed(() => new Map(
  (components.value ?? []).filter((c): c is ContentEvaluation => c.type === 'evaluation').map(c => [c.id, parseEvaluation(c)]),
))

function evaluationLabel(evaluation: ContentEvaluation) {
  const parsed = editable.value.get(evaluation.id)
  if (parsed) return EVALUATION_KINDS[parsed.kind].label
  return evaluation.blockType === 'problem' ? 'Problema avanzado' : blockTypeLabel(evaluation.blockType)
}

function evaluationMeta(evaluation: ContentEvaluation) {
  const parts = []
  if (evaluation.weight != null) parts.push(`${evaluation.weight} ${evaluation.weight === 1 ? 'punto' : 'puntos'}`)
  if (evaluation.blockType === 'problem') {
    parts.push(evaluation.maxAttempts ? `${evaluation.maxAttempts} ${evaluation.maxAttempts === 1 ? 'intento' : 'intentos'}` : 'intentos ilimitados')
  }
  return parts.join(' · ')
}

async function createEvaluation(input: EvaluationInput) {
  busy.value = true
  try {
    const unitId = await targetUnit()
    added(await $fetch<ContentEvaluation>(unitApi(unitId, '/evaluations'), { method: 'POST', body: input }))
    adding.value = null
    toast.add({ title: 'Evaluación agregada', color: 'success' })
  }
  catch (e) {
    reportError(e, 'No se pudo agregar la evaluación.')
  }
  finally {
    busy.value = false
  }
}

async function createStudioEvaluation(kind: StudioEvaluationKind) {
  busy.value = true
  try {
    const unitId = await targetUnit()
    added(await $fetch<ContentEvaluation>(unitApi(unitId, '/evaluations'), { method: 'POST', body: { studioKind: kind } }))
    adding.value = null
    toast.add({ title: `${STUDIO_EVALUATION_KINDS[kind].label} agregada`, description: 'Configúrala con “Editar en Studio”.', color: 'success' })
  }
  catch (e) {
    reportError(e, 'No se pudo agregar la evaluación.')
  }
  finally {
    busy.value = false
  }
}

async function saveEvaluation(evaluation: ContentEvaluation, input: EvaluationInput) {
  busy.value = true
  try {
    const saved = await $fetch<ContentEvaluation>(
      `${contentApi(props.courseKey, `/evaluations/${encodeURIComponent(evaluation.id)}`)}?unit=${encodeURIComponent(evaluation.unitId)}`,
      { method: 'PUT', body: input },
    )
    components.value = components.value!.map(c => (c.id === saved.id ? saved : c))
    editing.value = null
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo guardar la evaluación.')
  }
  finally {
    busy.value = false
  }
}

// --- rename / delete -------------------------------------------------------------

async function renameBlock(id: string, title: string) {
  try {
    await $fetch(blockApi(id), { method: 'PATCH', body: { title } })
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo renombrar.')
    throw e
  }
}

async function renameComponent(component: ContentComponent, title: string) {
  await renameBlock(component.id, title)
  component.title = title
}

async function removeComponent(component: ContentComponent) {
  const what = component.type === 'video' ? 'el video' : component.type === 'evaluation' ? 'la evaluación' : 'el componente'
  if (!confirm(`¿Eliminar ${what} “${component.title}” de la lección?`)) return
  try {
    await $fetch(blockApi(component.id), { method: 'DELETE' })
    components.value = components.value!.filter(c => c.id !== component.id)
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo eliminar.')
  }
}

async function removeLesson() {
  if (!confirm(`¿Eliminar la lección “${props.lesson.title}” con sus videos y evaluaciones?`)) return
  try {
    await $fetch(blockApi(props.lesson.id), { method: 'DELETE' })
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo eliminar la lección.')
  }
}
</script>

<template>
  <li class="lesson" :class="{ open }">
    <div class="lesson-head">
      <button type="button" class="toggle" :aria-expanded="open" :aria-label="`${open ? 'Cerrar' : 'Abrir'} lección ${lesson.title}`" @click="toggle">
        <span class="chevron" aria-hidden="true">›</span>
      </button>
      <span class="lesson-number">{{ number }}</span>
      <AdminEditableTitle class="lesson-title" :title="lesson.title" :save="title => renameBlock(lesson.id, title)" />
      <span v-if="lesson.format" class="badge badge-graded" :title="lesson.due ? `Fecha límite: ${formatDateTime(lesson.due)}` : undefined">
        {{ graderLabel(lesson.format) }}
      </span>
      <span v-if="lesson.hasChanges" class="badge badge-warning">Sin publicar</span>
      <span v-if="components" class="muted count">
        {{ videoCount }} {{ videoCount === 1 ? 'video' : 'videos' }} · {{ evaluationCount }} {{ evaluationCount === 1 ? 'evaluación' : 'evaluaciones' }}
      </span>
      <button type="button" class="link-button danger" @click="removeLesson">Eliminar</button>
    </div>

    <div v-if="open" class="lesson-body">
      <form class="grading" @submit.prevent="saveGrading">
        <div class="field">
          <label :for="`grading-${lesson.id}`">Calificación</label>
          <select :id="`grading-${lesson.id}`" v-model="grading.format">
            <option value="">No cuenta para la calificación</option>
            <option v-for="type in graders" :key="type" :value="type">Cuenta como {{ graderLabel(type) }}</option>
          </select>
        </div>
        <div v-if="grading.format" class="field">
          <label :for="`due-${lesson.id}`">Fecha límite <span class="muted">(opcional)</span></label>
          <input :id="`due-${lesson.id}`" v-model="grading.due" type="datetime-local">
        </div>
        <button v-if="gradingChanged" type="submit" class="btn btn-primary btn-small" :disabled="savingGrading">
          {{ savingGrading ? 'Guardando…' : 'Guardar' }}
        </button>
        <p class="field-hint grading-hint">
          Las evaluaciones de una lección calificada cuentan para la nota final con el peso de su tipo.
          <template v-if="!graders.length">Este curso aún no tiene tipos de calificación: defínelos en Studio → Calificación.</template>
        </p>
      </form>

      <div v-if="loadError" class="notice notice-error" role="alert">
        {{ loadError }}
        <button type="button" class="link-button" @click="loadComponents">Reintentar</button>
      </div>
      <p v-else-if="loading" class="muted">Cargando contenido…</p>

      <ol v-else-if="components?.length" class="components">
        <li v-for="component in components" :key="component.id" class="component">
          <div class="component-row">
            <span class="component-icon" :class="component.type" aria-hidden="true">
              {{ component.type === 'video' ? '▶' : component.type === 'evaluation' ? '?' : '¶' }}
            </span>
            <span class="component-main">
              <AdminEditableTitle :title="component.title" :save="title => renameComponent(component, title)" />
              <span class="muted component-meta">
                <template v-if="component.type === 'video'">{{ sourceLabel(component) }}</template>
                <template v-else-if="component.type === 'evaluation'">
                  {{ evaluationLabel(component) }}<template v-if="evaluationMeta(component)"> · {{ evaluationMeta(component) }}</template>
                </template>
                <template v-else>{{ blockTypeLabel(component.blockType) }}</template>
              </span>
            </span>
            <span class="component-actions">
              <button v-if="component.type === 'video' && (component.url || component.youtubeId)" type="button" class="link-button"
                      :aria-expanded="preview === component.id" @click="preview = preview === component.id ? null : component.id">
                {{ preview === component.id ? 'Ocultar' : 'Ver' }}
              </button>
              <button v-if="component.type === 'evaluation' && editable.get(component.id)" type="button" class="link-button"
                      :aria-expanded="editing === component.id" @click="editing = editing === component.id ? null : component.id">
                {{ editing === component.id ? 'Cerrar' : 'Editar' }}
              </button>
              <a v-else-if="component.type !== 'video'" :href="studioUnitUrl(config.public.studioUrl, component.unitId)" class="link-button" target="_blank" rel="noopener">
                Editar en Studio
              </a>
              <button type="button" class="link-button danger" @click="removeComponent(component)">Eliminar</button>
            </span>
          </div>

          <div v-if="component.type === 'video' && preview === component.id" class="player">
            <iframe
              v-if="component.youtubeId"
              :src="`https://www.youtube-nocookie.com/embed/${component.youtubeId}`"
              :title="component.title"
              allow="encrypted-media; picture-in-picture"
              allowfullscreen
            />
            <video v-else :src="component.url!" controls preload="metadata" />
          </div>

          <div v-if="component.type === 'evaluation' && editing === component.id" class="component-editor">
            <EvaluationEditor :initial="editable.get(component.id)!" :saving="busy" @save="input => saveEvaluation(component, input)" @cancel="editing = null" />
          </div>
        </li>
      </ol>
      <p v-else-if="components" class="muted empty-content">Esta lección aún no tiene videos ni evaluaciones.</p>

      <ul v-if="uploads.length" class="uploads" aria-live="polite">
        <li v-for="upload in uploads" :key="upload.key" class="upload" :class="upload.status">
          <div class="upload-row">
            <span class="upload-name">{{ upload.title }}</span>
            <span class="muted upload-size">{{ formatBytes(upload.file.size) }}</span>
            <span class="upload-status">
              <template v-if="upload.status === 'uploading'">
                {{ upload.progress < 1 ? `${Math.round(upload.progress * 100)} %` : 'Guardando…' }}
              </template>
              <template v-else-if="upload.status === 'waiting'">En espera</template>
            </span>
            <button v-if="upload.status === 'error'" type="button" class="link-button" @click="retryUpload(upload)">Reintentar</button>
            <button type="button" class="link-button" @click="cancelUpload(upload)">{{ upload.status === 'error' ? 'Quitar' : 'Cancelar' }}</button>
          </div>
          <progress v-if="upload.status !== 'error'" :value="upload.progress" max="1" :aria-label="`Subiendo ${upload.title}`" />
          <p v-else class="upload-error" role="alert">{{ upload.error }}</p>
        </li>
      </ul>

      <label
        class="dropzone"
        :class="{ dragging }"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input type="file" class="visually-hidden" accept="video/mp4,video/webm,video/ogg" multiple @change="onPick">
        <span class="dropzone-title">Arrastra videos aquí o <span class="dropzone-link">elige archivos</span></span>
        <span class="muted dropzone-hint">MP4, WebM u Ogg, hasta 2 GB cada uno. No cierres la página mientras se suben.</span>
      </label>

      <div v-if="!adding" class="add-actions">
        <button type="button" class="link-button add" @click="adding = 'link'">+ Video de YouTube o por enlace</button>
        <button type="button" class="link-button add" @click="adding = 'evaluation'">+ Evaluación</button>
      </div>

      <form v-else-if="adding === 'link'" class="add-panel" @submit.prevent="addLink">
        <div class="field">
          <label :for="`link-url-${lesson.id}`">Enlace</label>
          <input :id="`link-url-${lesson.id}`" v-model="link.url" type="url" placeholder="https://www.youtube.com/watch?v=…" required>
        </div>
        <div class="field">
          <label :for="`link-title-${lesson.id}`">Título</label>
          <input :id="`link-title-${lesson.id}`" v-model="link.title" type="text" maxlength="255" placeholder="Video">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-small" :disabled="busy">{{ busy ? 'Agregando…' : 'Agregar video' }}</button>
          <button type="button" class="btn btn-secondary btn-small" @click="adding = null">Cancelar</button>
        </div>
      </form>

      <div v-else-if="adding === 'evaluation'" class="add-panel">
        <div class="picker-head">
          <h4>¿Qué tipo de evaluación?</h4>
          <button type="button" class="link-button" @click="adding = null">Cancelar</button>
        </div>
        <div class="kinds">
          <button v-for="(info, kind) in EVALUATION_KINDS" :key="kind" type="button" class="kind" @click="adding = kind">
            <span class="kind-label">{{ info.label }}</span>
            <span class="muted kind-hint">{{ info.hint }}</span>
          </button>
        </div>
        <p class="picker-subtitle">Se crean aquí y se configuran en Studio</p>
        <div class="kinds">
          <button v-for="(info, kind) in STUDIO_EVALUATION_KINDS" :key="kind" type="button" class="kind studio" :disabled="busy" @click="createStudioEvaluation(kind)">
            <span class="kind-label">{{ info.label }}</span>
            <span class="muted kind-hint">{{ info.hint }}</span>
          </button>
        </div>
      </div>

      <EvaluationEditor v-else :initial="adding" :saving="busy" class="add-editor" @save="createEvaluation" @cancel="adding = null" />
    </div>
  </li>
</template>

<style scoped>
.lesson + .lesson {
  border-top: 1px solid var(--ui-border);
}

.lesson-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  padding: 12px 0;
}

.toggle {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: var(--ui-bg);
  cursor: pointer;
}

.toggle:hover {
  border-color: var(--ui-text-highlighted);
}

.toggle:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.chevron {
  font-size: 1.2rem;
  line-height: 1;
  transition: transform 0.2s;
}

.open .chevron {
  transform: rotate(90deg);
}

.lesson-number {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ui-primary);
  font-variant-numeric: tabular-nums;
}

.lesson-title {
  flex: 1 1 200px;
  font-weight: 600;
}

.badge-graded {
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
}

.count {
  font-size: 0.88rem;
}

.lesson-body {
  padding: 4px 0 20px 44px;
}

@media (max-width: 639px) {
  .lesson-body {
    padding-left: 0;
  }
}

.grading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg-muted);
}

.grading .field {
  flex: 1 1 220px;
  margin: 0;
}

.grading-hint {
  flex-basis: 100%;
  margin: 0;
}

.components {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  overflow: hidden;
}

.component + .component {
  border-top: 1px solid var(--ui-border);
}

.component-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 14px;
}

.component-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.component-icon.evaluation {
  background: var(--ui-color-success-50);
  color: var(--ui-color-success-700);
  font-size: 0.95rem;
}

.component-icon.other {
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
}

.component-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 200px;
  min-width: 0;
}

.component-meta {
  font-size: 0.82rem;
}

.component-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

a.link-button {
  text-decoration: none;
}

.player,
.component-editor {
  padding: 0 14px 14px;
}

.player video,
.player iframe {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 0;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-neutral-900);
}

.empty-content {
  margin: 0 0 16px;
}

.uploads {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.upload {
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
}

.upload.error {
  border-color: var(--ui-color-error-200);
  background: var(--ui-color-error-50);
}

.upload-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
}

.upload-name {
  flex: 1 1 180px;
  min-width: 0;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.upload-size,
.upload-status {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

progress {
  display: block;
  width: 100%;
  height: 6px;
  margin-top: 10px;
  border: 0;
  border-radius: 999px;
  overflow: hidden;
  appearance: none;
  background: var(--ui-color-primary-100);
}

progress::-webkit-progress-bar {
  background: var(--ui-color-primary-100);
}

progress::-webkit-progress-value {
  background: var(--ui-primary);
  transition: width 0.2s;
}

progress::-moz-progress-bar {
  background: var(--ui-primary);
}

.upload-error {
  margin: 6px 0 0;
  font-size: 0.88rem;
  color: var(--ui-color-error-800);
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 24px 16px;
  border: 1.5px dashed var(--ui-color-primary-300);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-primary-50);
  text-align: center;
  font-weight: 400;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.dropzone:hover,
.dropzone.dragging {
  border-color: var(--ui-primary);
  background: var(--ui-color-primary-100);
}

.dropzone:focus-within {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.dropzone-title {
  font-weight: 600;
}

.dropzone-link {
  color: var(--ui-primary);
  text-decoration: underline;
}

.dropzone-hint {
  font-size: 0.85rem;
}

.add-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 14px;
}

.add {
  color: var(--ui-primary);
}

.add-panel,
.add-editor {
  margin-top: 14px;
}

.add-panel {
  padding: 16px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
}

.picker-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.picker-head h4 {
  margin: 0;
  font-size: 1rem;
}

.picker-subtitle {
  margin: 18px 0 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ui-text-muted);
}

.kinds {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.kind {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.kind:hover {
  border-color: var(--ui-primary);
  background: var(--ui-color-primary-50);
}

.kind:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.kind.studio {
  border-style: dashed;
}

.kind:disabled {
  opacity: 0.55;
  cursor: progress;
}

.kind-label {
  font-weight: 600;
  color: var(--ui-text-highlighted);
}

.kind-hint {
  font-size: 0.82rem;
}

.add-panel .field + .field {
  margin-top: 14px;
}
</style>
