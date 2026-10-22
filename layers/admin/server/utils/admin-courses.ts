/**
 * Course authoring on top of the Studio and LMS APIs. Campus names map to
 * Open edX ones: module = section (chapter), lesson = subsection
 * (sequential), and each lesson keeps its videos in units (verticals).
 */
import type { H3Event } from 'h3'

interface StudioCourseRun {
  id: string
  title: string
  pacing_type: 'self_paced' | 'instructor_paced'
  images: { card_image: string }
}

/** Studio's course_details: PUT expects the whole object back. */
export interface StudioCourseDetails {
  org: string
  course_id: string
  run: string
  short_description: string
  overview: string
  effort: string | null
  start_date: string | null
  end_date: string | null
  self_paced: boolean
  course_image_asset_path: string
  [field: string]: unknown
}

interface StudioXBlock {
  id: string
  display_name: string
  category: string
  published: boolean
  has_changes?: boolean | null
  visibility_state?: string | null
  child_info?: { children: StudioXBlock[] } | null
}

interface CourseMode {
  mode_slug: string
  min_price: number
  currency: string
}

/** Studio's GET of a single block (`metadata` holds the Settings fields). */
export interface StudioBlockInfo {
  id: string
  metadata: Record<string, unknown>
}

export function getCourseDetails(event: H3Event, courseId: string) {
  return edxFetch<StudioCourseDetails>(event, studioUrl(`/api/contentstore/v1/course_details/${edxKey(courseId)}`))
}

export function putCourseDetails(event: H3Event, courseId: string, details: StudioCourseDetails) {
  return edxFetch<StudioCourseDetails>(event, studioUrl(`/api/contentstore/v1/course_details/${edxKey(courseId)}`), {
    method: 'PUT',
    body: details,
  })
}

/** Price comes from the `verified` mode, which the payments plugin sells. */
export async function getVerifiedMode(event: H3Event, courseId: string) {
  const modes = await edxFetch<CourseMode[]>(event, lmsApiUrl(`/api/course_modes/v1/courses/${edxKey(courseId)}/`))
  return modes.find(mode => mode.mode_slug === 'verified') ?? null
}

/** A price of null or 0 takes the course off sale. */
export async function setCoursePrice(event: H3Event, courseId: string, price: number | null) {
  const verified = await getVerifiedMode(event, courseId)
  if (verified) {
    await edxFetch(event, lmsApiUrl(`/api/course_modes/v1/courses/${edxKey(courseId)}/verified`), {
      method: 'PATCH',
      body: { min_price: price ?? 0 },
      headers: { 'content-type': 'application/merge-patch+json' },
    })
  }
  else if (price) {
    await edxFetch(event, lmsApiUrl(`/api/course_modes/v1/courses/${edxKey(courseId)}/`), {
      method: 'POST',
      body: { course_id: courseId, mode_slug: 'verified', mode_display_name: 'Verified', min_price: price, currency: 'mxn' },
    })
  }
}

export function toPrice(mode: CourseMode | null) {
  return { price: mode && mode.min_price > 0 ? mode.min_price : null, currency: mode?.currency ?? 'mxn' }
}

export async function getAdminCourse(event: H3Event, courseId: string): Promise<AdminCourse> {
  const [run, details, index, advanced, verified] = await Promise.all([
    edxFetch<StudioCourseRun>(event, studioUrl(`/api/v1/course_runs/${edxKey(courseId)}/`)),
    getCourseDetails(event, courseId),
    edxFetch<{ course_structure: StudioXBlock }>(event, studioUrl(`/api/contentstore/v1/course_index/${edxKey(courseId)}`)),
    edxFetch<{ catalog_visibility?: { value: string } }>(event, studioUrl(`/api/contentstore/v0/advanced_settings/${edxKey(courseId)}`)),
    getVerifiedMode(event, courseId),
  ])
  const modules = toModules(index.course_structure)
  const [, number = '', runName = ''] = courseId.slice('course-v1:'.length).split('+')
  return {
    id: courseId,
    name: run.title,
    org: details.org,
    number,
    run: runName,
    ...toPrice(verified),
    shortDescription: details.short_description ?? '',
    overview: details.overview === '<p>&nbsp;</p>' ? '' : details.overview ?? '',
    effort: details.effort ?? '',
    start: details.start_date,
    end: details.end_date,
    pacing: details.self_paced ? 'self' : 'instructor',
    image: details.course_image_asset_path ? run.images.card_image : null,
    visible: (advanced.catalog_visibility?.value ?? 'both') === 'both',
    hasUnpublishedChanges: modules.some(m => m.hasChanges || m.lessons.some(l => l.hasChanges)),
    rootId: index.course_structure.id,
    modules,
  }
}

function hasChanges(block: StudioXBlock) {
  return !block.published || !!block.has_changes || block.visibility_state === 'needs_attention'
}

function toModules(root: StudioXBlock): AdminModule[] {
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
    })),
  }))
}

/** Creates a block and returns its usage key. */
export async function createBlock(event: H3Event, courseId: string, parentId: string, category: string, title: string) {
  const created = await edxFetch<{ locator: string }>(event, studioUrl(`/api/contentstore/v0/xblock/${edxKey(courseId)}`), {
    method: 'POST',
    body: { parent_locator: parentId, category, display_name: title },
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

export function toAdminVideo(unitId: string, block: StudioBlockInfo): AdminVideo {
  const sources = block.metadata.html5_sources
  const youtubeId = block.metadata.youtube_id_1_0
  return {
    id: block.id,
    unitId,
    title: String(block.metadata.display_name ?? 'Video'),
    url: Array.isArray(sources) && typeof sources[0] === 'string' ? sources[0] : null,
    youtubeId: typeof youtubeId === 'string' && youtubeId ? youtubeId : null,
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
  return toAdminVideo(unitId, { id, metadata })
}

/** Unit keys are checked by Studio too; this keeps chapters etc. out. */
export function unitIdParam(event: H3Event, courseId: string) {
  const unitId = blockIdParam(event, courseId, 'unit')
  if (!unitId.includes('+type@vertical+block@')) {
    throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
  }
  return unitId
}
