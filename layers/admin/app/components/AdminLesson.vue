<script setup lang="ts">
/**
 * One lesson of the outline: its videos, uploads and links. Videos load the
 * first time the lesson is opened. New videos go to the lesson's last unit.
 */
const props = defineProps<{ courseId: string, lesson: AdminLesson, number: string }>()
const emit = defineEmits<{ changed: [] }>()
const toast = useToast()

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg']
const MAX_VIDEO_BYTES = 2 * 1024 ** 3

const open = ref(false)
const videos = ref<AdminVideo[] | null>(null)
const loading = ref(false)
const loadError = ref('')
const preview = ref<string | null>(null)
// Units created here show up in props only after the parent refreshes.
const unitIds = ref([...props.lesson.unitIds])
watch(() => props.lesson.unitIds, (ids) => { unitIds.value = [...ids] })

function unitApi(unitId: string, path: string) {
  return adminCourseApi(props.courseId, `/units/${encodeURIComponent(unitId)}${path}`)
}

async function loadVideos() {
  loading.value = true
  loadError.value = ''
  try {
    const perUnit = await Promise.all(unitIds.value.map(id => $fetch<AdminVideo[]>(unitApi(id, '/videos'))))
    videos.value = perUnit.flat()
  }
  catch (e) {
    loadError.value = apiErrorMessage(e, 'No pudimos cargar los videos.')
  }
  finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value && !videos.value && !loading.value) loadVideos()
}

async function targetUnit() {
  const last = unitIds.value.at(-1)
  if (last) return last
  // Lessons made in Studio may have no unit yet.
  const unit = await $fetch<{ id: string }>(adminCourseApi(props.courseId, '/blocks'), {
    method: 'POST',
    body: { kind: 'unit', parentId: props.lesson.id, title: props.lesson.title } satisfies AdminBlockInput,
  })
  unitIds.value.push(unit.id)
  return unit.id
}

function reportError(e: unknown, fallback: string) {
  toast.add({ title: apiErrorMessage(e, fallback), color: 'error' })
}

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
      videos.value = [...(videos.value ?? []), video]
      uploads.value = uploads.value.filter(u => u !== upload)
      emit('changed')
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

const linkOpen = ref(false)
const link = reactive({ title: '', url: '' })
const addingLink = ref(false)
async function addLink() {
  addingLink.value = true
  try {
    const unitId = await targetUnit()
    const video = await $fetch<AdminVideo>(unitApi(unitId, '/videos'), {
      method: 'POST',
      body: { title: link.title || 'Video', url: link.url },
    })
    videos.value = [...(videos.value ?? []), video]
    link.title = ''
    link.url = ''
    linkOpen.value = false
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo agregar el video.')
  }
  finally {
    addingLink.value = false
  }
}

async function renameBlock(id: string, title: string) {
  try {
    await $fetch(adminCourseApi(props.courseId, `/blocks/${encodeURIComponent(id)}`), { method: 'PATCH', body: { title } })
    emit('changed')
  }
  catch (e) {
    reportError(e, 'No se pudo renombrar.')
    throw e
  }
}

async function renameVideo(video: AdminVideo, title: string) {
  await renameBlock(video.id, title)
  video.title = title
}

async function deleteBlock(id: string) {
  await $fetch(adminCourseApi(props.courseId, `/blocks/${encodeURIComponent(id)}`), { method: 'DELETE' })
  emit('changed')
}

async function removeVideo(video: AdminVideo) {
  if (!confirm(`¿Eliminar el video “${video.title}” de la lección?`)) return
  try {
    await deleteBlock(video.id)
    videos.value = videos.value!.filter(v => v.id !== video.id)
  }
  catch (e) {
    reportError(e, 'No se pudo eliminar el video.')
  }
}

async function removeLesson() {
  if (!confirm(`¿Eliminar la lección “${props.lesson.title}” y todos sus videos?`)) return
  try {
    await deleteBlock(props.lesson.id)
  }
  catch (e) {
    reportError(e, 'No se pudo eliminar la lección.')
  }
}

function sourceLabel(video: AdminVideo) {
  if (video.youtubeId) return 'YouTube'
  if (video.url?.includes('/media/videos/')) return 'Archivo subido'
  return video.url ? 'Enlace externo' : 'Sin fuente'
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
      <span v-if="lesson.hasChanges" class="badge badge-warning">Sin publicar</span>
      <span v-if="videos" class="muted video-count">{{ videos.length }} {{ videos.length === 1 ? 'video' : 'videos' }}</span>
      <button type="button" class="link-button danger" @click="removeLesson">Eliminar</button>
    </div>

    <div v-if="open" class="lesson-body">
      <div v-if="loadError" class="notice notice-error" role="alert">
        {{ loadError }}
        <button type="button" class="link-button" @click="loadVideos">Reintentar</button>
      </div>
      <p v-else-if="loading" class="muted">Cargando videos…</p>

      <ol v-else-if="videos?.length" class="videos">
        <li v-for="video in videos" :key="video.id" class="video">
          <div class="video-row">
            <span class="video-icon" aria-hidden="true">▶</span>
            <span class="video-main">
              <AdminEditableTitle :title="video.title" :save="title => renameVideo(video, title)" />
              <span class="muted video-source">{{ sourceLabel(video) }}</span>
            </span>
            <span class="video-actions">
              <button v-if="video.url || video.youtubeId" type="button" class="link-button" :aria-expanded="preview === video.id" @click="preview = preview === video.id ? null : video.id">
                {{ preview === video.id ? 'Ocultar' : 'Ver' }}
              </button>
              <button type="button" class="link-button danger" @click="removeVideo(video)">Eliminar</button>
            </span>
          </div>
          <div v-if="preview === video.id" class="player">
            <iframe
              v-if="video.youtubeId"
              :src="`https://www.youtube-nocookie.com/embed/${video.youtubeId}`"
              :title="video.title"
              allow="encrypted-media; picture-in-picture"
              allowfullscreen
            />
            <video v-else :src="video.url!" controls preload="metadata" />
          </div>
        </li>
      </ol>
      <p v-else-if="videos" class="muted empty-videos">Esta lección aún no tiene videos.</p>

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

      <div class="link-video">
        <button v-if="!linkOpen" type="button" class="link-button" @click="linkOpen = true">+ Agregar video de YouTube o por enlace</button>
        <form v-else class="link-form" @submit.prevent="addLink">
          <div class="field">
            <label :for="`link-url-${lesson.id}`">Enlace</label>
            <input :id="`link-url-${lesson.id}`" v-model="link.url" type="url" placeholder="https://www.youtube.com/watch?v=…" required>
          </div>
          <div class="field">
            <label :for="`link-title-${lesson.id}`">Título</label>
            <input :id="`link-title-${lesson.id}`" v-model="link.title" type="text" maxlength="255" placeholder="Video">
          </div>
          <div class="link-actions">
            <button type="submit" class="btn btn-primary btn-small" :disabled="addingLink">{{ addingLink ? 'Agregando…' : 'Agregar video' }}</button>
            <button type="button" class="btn btn-secondary btn-small" @click="linkOpen = false">Cancelar</button>
          </div>
        </form>
      </div>
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

.video-count {
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

.videos {
  margin: 0 0 16px;
  padding: 0;
  list-style: none;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  overflow: hidden;
}

.video + .video {
  border-top: 1px solid var(--ui-border);
}

.video-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 14px;
}

.video-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--brand-radius-sm);
  background: var(--ui-color-primary-100);
  color: var(--ui-primary);
  font-size: 0.75rem;
}

.video-main {
  display: flex;
  flex-direction: column;
  flex: 1 1 200px;
  min-width: 0;
}

.video-source {
  font-size: 0.82rem;
}

.video-actions {
  display: flex;
  gap: 16px;
}

.player {
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

.empty-videos {
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

.link-video {
  margin-top: 14px;
}

.link-form {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--ui-border);
  border-radius: var(--brand-radius-sm);
  background: var(--ui-bg);
}

.link-form .field + .field {
  margin-top: 0;
}

.link-actions {
  display: flex;
  gap: 10px;
}
</style>
