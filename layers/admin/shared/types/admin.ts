/** The staff user using the admin area, from the LMS JWT. */
export interface AdminUser {
  username: string
  email: string
  name: string
}

/** A row of the admin course list. */
export interface AdminCourseSummary {
  id: string
  name: string
  org: string
  number: string
  run: string
  /** Whole MXN (or the verified mode's currency); null when it has no price. */
  price: number | null
  currency: string
}

export interface AdminCourse extends AdminCourseSummary {
  shortDescription: string
  /** HTML shown on the course page. */
  overview: string
  effort: string
  start: string | null
  end: string | null
  pacing: 'self' | 'instructor'
  image: string | null
  /** Listed in the Campus catalog (Open edX catalog visibility). */
  visible: boolean
  /** Some module or lesson has changes students don't see yet. */
  hasUnpublishedChanges: boolean
  /** Usage key of the course root, parent of the modules. */
  rootId: string
  modules: AdminModule[]
}

/** Open edX section (chapter). */
export interface AdminModule {
  id: string
  title: string
  published: boolean
  hasChanges: boolean
  lessons: AdminLesson[]
}

/** Open edX subsection (sequential); its units hold the videos. */
export interface AdminLesson {
  id: string
  title: string
  published: boolean
  hasChanges: boolean
  unitIds: string[]
}

export interface AdminVideo {
  id: string
  unitId: string
  title: string
  /** File URL (uploaded or external), or null for YouTube videos. */
  url: string | null
  youtubeId: string | null
}

export interface AdminCourseCreateInput {
  name: string
  org: string
  number: string
  run: string
  pacing: 'self' | 'instructor'
  start: string | null
  price: number | null
}

export type AdminCourseUpdateInput = Partial<Pick<AdminCourse,
  'name' | 'shortDescription' | 'overview' | 'effort' | 'start' | 'end' | 'pacing' | 'visible'
>>

export type AdminBlockInput =
  | { kind: 'module', title: string }
  | { kind: 'lesson' | 'unit', parentId: string, title: string }
