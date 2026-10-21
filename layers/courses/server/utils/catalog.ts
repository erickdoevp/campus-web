/**
 * Server-side course catalog. Runs only in Nitro, so the browser never talks
 * to the CMS or LMS APIs directly (no CORS needed).
 *
 * Each source answers for what it owns:
 * - Campus CMS (public catalog API): which courses are for sale, their title,
 *   descriptions, image and price.
 * - Open edX LMS (Course API): dates, pacing and effort, set in Studio.
 */

interface CatalogEntry {
  id: string
  title: string
  org: string
  number: string
  short_description: string
  description: string
  image: string | null
  price: number | null
  currency: string
  on_sale: boolean
}

interface EdxCourse {
  id: string
  start: string | null
  start_display: string | null
  end: string | null
  effort: string | null
  pacing: string
}

interface EdxPage<T> {
  results: T[]
  pagination: { next: string | null }
}

function cmsCatalogUrl(path = '') {
  return `${useRuntimeConfig().campusCmsUrl.replace(/\/$/, '')}/api/v1/catalog/${path}`
}

function lmsUrl() {
  return useRuntimeConfig().openedxLmsUrl.replace(/\/$/, '')
}

function isNotFound(error: any) {
  return error?.statusCode === 404 || error?.statusCode === 400
}

function toSummary(entry: CatalogEntry, course?: EdxCourse): CourseSummary {
  return {
    id: entry.id,
    name: entry.title,
    org: entry.org,
    number: entry.number,
    shortDescription: entry.short_description,
    image: entry.image,
    start: course?.start ?? null,
    startDisplay: course?.start_display ?? null,
    pacing: course?.pacing ?? 'self',
    price: entry.price,
    currency: entry.currency,
    purchasable: entry.on_sale && !!entry.price,
  }
}

async function listEdxCourses() {
  const courses: EdxCourse[] = []
  let url: string | null = `${lmsUrl()}/api/courses/v1/courses/?page_size=100`
  while (url) {
    const page: EdxPage<EdxCourse> = await $fetch<EdxPage<EdxCourse>>(url)
    courses.push(...page.results)
    url = page.pagination.next
  }
  return new Map(courses.map(course => [course.id, course]))
}

export async function listCourses(): Promise<CourseSummary[]> {
  const [entries, edxCourses] = await Promise.all([
    $fetch<CatalogEntry[]>(cmsCatalogUrl()),
    listEdxCourses(),
  ])
  return entries.map(entry => toSummary(entry, edxCourses.get(entry.id)))
}

export async function getCourse(id: string): Promise<CourseDetail | null> {
  const encoded = encodeURIComponent(id)
  const [entry, course] = await Promise.all([
    $fetch<CatalogEntry>(cmsCatalogUrl(`${encoded}/`)).catch((error) => {
      if (isNotFound(error)) return null
      throw error
    }),
    // Shown without dates rather than failing if the LMS doesn't know it.
    $fetch<EdxCourse>(`${lmsUrl()}/api/courses/v1/courses/${encoded}/`).catch((error) => {
      if (isNotFound(error)) return undefined
      throw error
    }),
  ])
  if (!entry) return null
  return {
    ...toSummary(entry, course),
    description: entry.description,
    effort: course?.effort ?? null,
    end: course?.end ?? null,
  }
}

/**
 * Forgets the cached /api/courses answers (defineCachedEventHandler, 60 s), so
 * a change made in the admin shows up on the site right away. Per server
 * instance: with several instances, back the "cache" storage with Redis.
 */
export async function invalidateCatalogCache() {
  const storage = useStorage('cache')
  const keys = await storage.getKeys('nitro:handlers')
  await Promise.all(keys.filter(key => /^nitro:handlers:courses?:/.test(key)).map(key => storage.removeItem(key)))
}
