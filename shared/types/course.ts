export interface CourseSummary {
  id: string
  name: string
  org: string
  number: string
  shortDescription: string
  image: string | null
  start: string | null
  startDisplay: string | null
  pacing: 'self' | 'instructor' | string
  price: number | null
  currency: string | null
  purchasable: boolean
}

export interface CourseDetail extends CourseSummary {
  /** HTML authored in Studio ("About" page). */
  overview: string
  effort: string | null
  end: string | null
}
