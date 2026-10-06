/**
 * Server-side access to the Open edX LMS APIs. Runs only in Nitro, so the
 * browser never talks to the LMS APIs directly (no CORS needed).
 */

interface EdxCourse {
  id: string
  name: string
  org: string
  number: string
  short_description: string | null
  media?: { image?: { large?: string | null, raw?: string | null } }
  start: string | null
  start_display: string | null
  end: string | null
  effort: string | null
  pacing: string
  hidden: boolean
  invitation_only: boolean
  overview?: string
}

interface EdxPage<T> {
  results: T[]
  pagination: { next: string | null }
}

interface CoursePrice {
  price: number | null
  currency: string | null
  purchasable: boolean
}

function lmsUrl() {
  return useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')
}

async function fetchPrice(id: string): Promise<CoursePrice> {
  try {
    return await $fetch<CoursePrice>(`${lmsUrl()}/payments/api/v1/courses/${encodeURIComponent(id)}/`)
  }
  catch {
    return { price: null, currency: null, purchasable: false }
  }
}

function toSummary(course: EdxCourse, price: CoursePrice): CourseSummary {
  return {
    id: course.id,
    name: course.name,
    org: course.org,
    number: course.number,
    shortDescription: course.short_description ?? '',
    image: course.media?.image?.large || course.media?.image?.raw || null,
    start: course.start,
    startDisplay: course.start_display,
    pacing: course.pacing,
    price: price.price,
    currency: price.currency,
    purchasable: price.purchasable,
  }
}

export async function listCourses(): Promise<CourseSummary[]> {
  const courses: EdxCourse[] = []
  let url: string | null = `${lmsUrl()}/api/courses/v1/courses/?page_size=100`
  while (url) {
    const page: EdxPage<EdxCourse> = await $fetch<EdxPage<EdxCourse>>(url)
    courses.push(...page.results)
    url = page.pagination.next
  }
  const visible = courses.filter(c => !c.hidden && !c.invitation_only)
  const prices = await Promise.all(visible.map(c => fetchPrice(c.id)))
  return visible.map((course, i) => toSummary(course, prices[i]!))
}

export async function getCourse(id: string): Promise<CourseDetail | null> {
  let course: EdxCourse
  try {
    course = await $fetch<EdxCourse>(`${lmsUrl()}/api/courses/v1/courses/${encodeURIComponent(id)}/`)
  }
  catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 400) return null
    throw error
  }
  const price = await fetchPrice(id)
  return {
    ...toSummary(course, price),
    overview: course.overview ?? '',
    effort: course.effort,
    end: course.end,
  }
}
