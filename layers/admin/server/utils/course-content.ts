/**
 * Course content on top of the Studio API, as the logged-in user: the outline
 * (modules → lessons → units), videos and evaluations. Ported from the
 * course editor of the feat/front-admin branch; the course itself, its price
 * and its sale status stay in the CMS.
 */
import type { H3Event } from 'h3'

interface StudioXBlock {
  id: string
  display_name: string
  category: string
  published: boolean
  has_changes?: boolean | null
  visibility_state?: string | null
  graded?: boolean
  format?: string | null
  due?: string | null
  child_info?: { children: StudioXBlock[] } | null
}

/** Studio's GET of a single block (`metadata` holds the Settings fields, `data` the OLX). */
export interface StudioBlockInfo {
  id: string
  data?: string
  metadata: Record<string, unknown>
}

interface ContainerChild {
  name: string
  block_id: string
  block_type: string
}

/** Studio's course_details: PUT expects the whole object back. */
export interface StudioCourseDetailsDoc {
  org: string
  course_id: string
  run: string
  short_description: string
  start_date: string | null
  end_date: string | null
  self_paced: boolean
  [field: string]: unknown
}

export function getCourseDetails(event: H3Event, courseId: string) {
  return edxFetch<StudioCourseDetailsDoc>(event, studioUrl(`/api/contentstore/v1/course_details/${edxKey(courseId)}`))
}

export async function getOutline(event: H3Event, courseId: string): Promise<CourseOutline> {
  const [index, grading] = await Promise.all([
    edxFetch<{ course_structure: StudioXBlock }>(event, studioUrl(`/api/contentstore/v1/course_index/${edxKey(courseId)}`)),
    edxFetch<{ course_details: { graders: { type: string }[] } }>(event, studioUrl(`/api/contentstore/v1/course_grading/${edxKey(courseId)}`)),
  ])
  const modules = toModules(index.course_structure)
  return {
    id: courseId,
    rootId: index.course_structure.id,
    hasUnpublishedChanges: modules.some(m => m.hasChanges || m.lessons.some(l => l.hasChanges)),
    graders: grading.course_details.graders.map(g => g.type).filter(Boolean),
    modules,
  }
}

function hasChanges(block: StudioXBlock) {
  return !block.published || !!block.has_changes || block.visibility_state === 'needs_attention'
}

function toModules(root: StudioXBlock): ContentModule[] {
  return (root.child_info?.children ?? []).map(chapter => ({
    id: chapter.id,
    title: chapter.display_name,
    published: chapter.published,
    hasChanges: hasChanges(chapter),
    lessons: (chapter.child_info?.children ?? []).map(sequential => ({
      id: sequential.id,
      title: sequential.display_name,
      published: sequential.published,
      hasChanges: hasChanges(sequential),
      unitIds: (sequential.child_info?.children ?? []).map(unit => unit.id),
      format: sequential.graded && sequential.format ? sequential.format : null,
      due: sequential.due ?? null,
    })),
  }))
}

/** Creates a block and returns its usage key. */
export async function createBlock(event: H3Event, courseId: string, parentId: string, category: string, title?: string, boilerplate?: string) {
  const created = await edxFetch<{ locator: string }>(event, studioUrl(`/api/contentstore/v0/xblock/${edxKey(courseId)}`), {
    method: 'POST',
    body: { parent_locator: parentId, category, ...(title ? { display_name: title } : {}), ...(boilerplate ? { boilerplate } : {}) },
  })
  return created.locator
}

export function updateBlock(event: H3Event, courseId: string, blockId: string, body: Record<string, unknown>) {
  return edxFetch(event, studioUrl(`/api/contentstore/v0/xblock/${edxKey(courseId)}/${edxKey(blockId)}`), {
    method: 'PATCH',
    body,
  })
}

export function getBlock(event: H3Event, courseId: string, blockId: string) {
  return edxFetch<StudioBlockInfo>(event, studioUrl(`/api/contentstore/v0/xblock/${edxKey(courseId)}/${edxKey(blockId)}`))
}

export function deleteBlock(event: H3Event, courseId: string, blockId: string) {
  return edxFetch(event, studioUrl(`/api/contentstore/v0/xblock/${edxKey(courseId)}/${edxKey(blockId)}`), { method: 'DELETE' })
}

/** Publishes every module with pending changes, lessons and their content included. */
export async function publishCourse(event: H3Event, courseId: string) {
  const outline = await getOutline(event, courseId)
  // One at a time: parallel publishes contend for the same course in the modulestore.
  for (const module of outline.modules) {
    if (module.hasChanges || module.lessons.some(lesson => lesson.hasChanges)) {
      await updateBlock(event, courseId, module.id, { publish: 'make_public' })
    }
  }
}

/** Block types Campus shows as evaluations (problems and the Studio-edited ones). */
const EVALUATION_BLOCK_TYPES = new Set(['problem', ...Object.values(STUDIO_EVALUATION_KINDS).map(k => k.category)])

/** The unit's videos, evaluations and other components, in order. */
export async function getUnitComponents(event: H3Event, courseId: string, unitId: string): Promise<ContentComponent[]> {
  const { children } = await edxFetch<{ children: ContainerChild[] }>(
    event,
    studioUrl(`/api/contentstore/v1/container/${edxKey(unitId)}/children`),
  )
  return Promise.all(children.map(async (child): Promise<ContentComponent> => {
    if (child.block_type === 'video') {
      return toVideo(unitId, await getBlock(event, courseId, child.block_id), child.block_id)
    }
    if (child.block_type === 'problem') {
      return toEvaluation(unitId, child.block_type, await getBlock(event, courseId, child.block_id), child.block_id)
    }
    if (EVALUATION_BLOCK_TYPES.has(child.block_type)) {
      return { type: 'evaluation', id: child.block_id, unitId, title: child.name, blockType: child.block_type, olx: null, maxAttempts: null, weight: null, showAnswer: null }
    }
    return { type: 'other', id: child.block_id, unitId, title: child.name, blockType: child.block_type }
  }))
}

export function toVideo(unitId: string, block: StudioBlockInfo, id = block.id): ContentVideo {
  const sources = block.metadata.html5_sources
  const youtubeId = block.metadata.youtube_id_1_0
  return {
    type: 'video',
    id,
    unitId,
    title: String(block.metadata.display_name ?? 'Video'),
    url: Array.isArray(sources) && typeof sources[0] === 'string' ? sources[0] : null,
    youtubeId: typeof youtubeId === 'string' && youtubeId ? youtubeId : null,
  }
}

function toEvaluation(unitId: string, blockType: string, block: StudioBlockInfo, id = block.id): ContentEvaluation {
  const { display_name: title, max_attempts: maxAttempts, weight, showanswer } = block.metadata
  return {
    type: 'evaluation',
    id,
    unitId,
    title: String(title ?? 'Evaluación'),
    blockType,
    olx: blockType === 'problem' && typeof block.data === 'string' ? block.data : null,
    maxAttempts: typeof maxAttempts === 'number' ? maxAttempts : null,
    weight: typeof weight === 'number' ? weight : null,
    showAnswer: typeof showanswer === 'string' && showanswer in SHOW_ANSWER ? showanswer as ShowAnswer : null,
  }
}

/**
 * Adds a video component to a unit. Exactly one of `url` (a file browsers can
 * play) or `youtubeId` is set, and the other source is cleared: Open edX
 * defaults new videos to a sample YouTube clip.
 */
export async function createVideo(event: H3Event, courseId: string, unitId: string, title: string, source: { url: string } | { youtubeId: string }) {
  const id = await createBlock(event, courseId, unitId, 'video', title)
  const metadata = 'url' in source
    ? { display_name: title, html5_sources: [source.url], youtube_id_1_0: '' }
    : { display_name: title, html5_sources: [], youtube_id_1_0: source.youtubeId }
  try {
    await updateBlock(event, courseId, id, { metadata })
  }
  catch (error) {
    await deleteBlock(event, courseId, id).catch(() => {})
    throw error
  }
  return toVideo(unitId, { id, metadata })
}

function evaluationFields(input: EvaluationInput) {
  return {
    data: evaluationOlx(input),
    metadata: {
      display_name: input.title.trim(),
      max_attempts: input.maxAttempts,
      weight: input.weight,
      showanswer: input.showAnswer,
      // Studio's simple editor keeps its own copy of the problem: drop it so Studio shows this OLX.
      markdown: null,
    },
  }
}

/** Reads and validates an evaluation from a request body (400 with the reason). */
export async function readEvaluation(event: H3Event): Promise<EvaluationInput> {
  const input = await readBody<EvaluationInput>(event)
  if (!input || typeof input !== 'object' || !(input.kind in EVALUATION_KINDS)) {
    throw createError({ statusCode: 400, statusMessage: 'Tipo de evaluación inválido' })
  }
  // Coerce the shapes the checks below rely on, so bad JSON answers 400, not 500.
  const strings = (value: unknown) => (Array.isArray(value) ? value.map(v => String(v ?? '')) : [])
  const clean = {
    ...input,
    title: String(input.title ?? ''),
    question: String(input.question ?? ''),
    explanation: String(input.explanation ?? ''),
    maxAttempts: input.maxAttempts == null ? null : Number(input.maxAttempts),
    weight: Number(input.weight),
  } as EvaluationInput
  if (clean.kind === 'numerical') Object.assign(clean, { answer: String(clean.answer ?? ''), tolerance: String(clean.tolerance ?? '') })
  if (clean.kind === 'text') Object.assign(clean, { answers: strings(clean.answers), caseSensitive: !!clean.caseSensitive })
  if (clean.kind === 'multiple_choice' || clean.kind === 'checkboxes' || clean.kind === 'dropdown') {
    const choices = Array.isArray(clean.choices) ? clean.choices : []
    clean.choices = choices.map(c => ({ text: String(c?.text ?? ''), correct: !!c?.correct }))
  }
  const problem = evaluationProblem(clean)
  if (problem) throw createError({ statusCode: 400, statusMessage: problem })
  return clean
}

/** Adds a problem written in Campus to a unit. */
export async function createEvaluation(event: H3Event, courseId: string, unitId: string, input: EvaluationInput) {
  const id = await createBlock(event, courseId, unitId, 'problem', input.title.trim())
  const fields = evaluationFields(input)
  try {
    await updateBlock(event, courseId, id, fields)
  }
  catch (error) {
    await deleteBlock(event, courseId, id).catch(() => {})
    throw error
  }
  return toEvaluation(unitId, 'problem', { id, ...fields })
}

export async function updateEvaluation(event: H3Event, courseId: string, blockId: string, unitId: string, input: EvaluationInput) {
  // Studio removes fields sent as null: unlimited attempts falls back to the course default.
  const fields = evaluationFields(input)
  await updateBlock(event, courseId, blockId, fields)
  return toEvaluation(unitId, 'problem', { id: blockId, ...fields })
}

/** Adds one of the types Studio edits (drag and drop, open response...) with Studio's defaults. */
export async function createStudioEvaluation(event: H3Event, courseId: string, unitId: string, kind: StudioEvaluationKind, title: string) {
  const { category, boilerplate } = STUDIO_EVALUATION_KINDS[kind]
  const id = await createBlock(event, courseId, unitId, category, title, boilerplate)
  if (category === 'problem') return toEvaluation(unitId, category, await getBlock(event, courseId, id), id)
  // Studio's single-block GET fails on blocks whose `data` isn't text (drag and drop): don't read them back.
  return toEvaluation(unitId, category, { id, metadata: { display_name: title } })
}

/** Unit keys are checked by Studio too; this keeps chapters etc. out. */
export function unitIdParam(event: H3Event, courseId: string) {
  const unitId = blockIdParam(event, courseId, 'unit')
  if (!unitId.includes('+type@vertical+block@')) {
    throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
  }
  return unitId
}
