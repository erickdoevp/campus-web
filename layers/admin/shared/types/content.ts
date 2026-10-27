/**
 * Course content, as Campus shows it. Names map to Open edX ones:
 * module = section (chapter), lesson = subsection (sequential), and each
 * lesson keeps its videos and evaluations in units (verticals).
 */

export interface CourseOutline {
  id: string
  /** Usage key of the course root, parent of the modules. */
  rootId: string
  /** Some module or lesson has changes students don't see yet. */
  hasUnpublishedChanges: boolean
  /** Assignment types of the course's grading policy (Studio → Calificación), e.g. "Homework". */
  graders: string[]
  modules: ContentModule[]
}

/** Open edX section (chapter). */
export interface ContentModule {
  id: string
  title: string
  published: boolean
  hasChanges: boolean
  lessons: ContentLesson[]
}

/** Open edX subsection (sequential); its units hold videos and evaluations. */
export interface ContentLesson {
  id: string
  title: string
  published: boolean
  hasChanges: boolean
  unitIds: string[]
  /** Assignment type it counts for, or null when it isn't graded. */
  format: string | null
  /** Deadline (ISO), only meaningful when graded. */
  due: string | null
}

export interface ContentVideo {
  type: 'video'
  id: string
  unitId: string
  title: string
  /** File URL (uploaded or external), or null for YouTube videos. */
  url: string | null
  youtubeId: string | null
}

export interface ContentEvaluation {
  type: 'evaluation'
  id: string
  unitId: string
  title: string
  /** Open edX block type: "problem", "drag-and-drop-v2", "openassessment"... */
  blockType: string
  /** OLX of a "problem" block; Campus edits the simple ones, the rest go to Studio. */
  olx: string | null
  maxAttempts: number | null
  weight: number | null
  showAnswer: ShowAnswer | null
}

/** Anything else in the unit (text, HTML, discussions...): shown, edited in Studio. */
export interface ContentOther {
  type: 'other'
  id: string
  unitId: string
  title: string
  blockType: string
}

export type ContentComponent = ContentVideo | ContentEvaluation | ContentOther

export type ContentBlockInput =
  | { kind: 'module', title: string }
  | { kind: 'lesson' | 'unit', parentId: string, title: string }

export interface LessonGradingInput {
  /** Assignment type, or null for "not graded". */
  format: string | null
  due: string | null
}

/** Question types Campus can write and edit. */
export type EvaluationKind = 'multiple_choice' | 'checkboxes' | 'dropdown' | 'numerical' | 'text'

/** Types created here and finished in Studio, which has their editors. */
export type StudioEvaluationKind = 'drag_and_drop' | 'open_response' | 'math' | 'image' | 'custom'

/** When students can see the correct answer (Open edX `showanswer`). */
export type ShowAnswer = 'finished' | 'attempted' | 'past_due' | 'never'

export interface EvaluationChoice {
  text: string
  correct: boolean
}

export type EvaluationQuestion =
  | { kind: 'multiple_choice' | 'checkboxes' | 'dropdown', question: string, choices: EvaluationChoice[], explanation: string }
  /** `tolerance`: "" (exact), an absolute margin ("0.5") or a percentage ("5%"). */
  | { kind: 'numerical', question: string, answer: string, tolerance: string, explanation: string }
  | { kind: 'text', question: string, answers: string[], caseSensitive: boolean, explanation: string }

export type EvaluationInput = EvaluationQuestion & {
  title: string
  /** null: unlimited. */
  maxAttempts: number | null
  /** Points it's worth inside the lesson. */
  weight: number
  showAnswer: ShowAnswer
}

/** An existing Open edX course, for "take an existing course". */
export interface StudioCourse {
  id: string
  name: string
  org: string
  number: string
  run: string
}

/** What "take an existing course" prefills from Studio; the name and key come from StudioCourse. */
export interface StudioCourseDetails {
  shortDescription: string
  start: string | null
  end: string | null
  pacing: 'self' | 'instructor'
}
