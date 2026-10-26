/**
 * Deletes a course and everything that belongs to it:
 * 1. Studio: content, files and staff roles; the course overview and search
 *    entries go with them (plugin endpoint, /campus/ in Studio).
 * 2. LMS: enrollments, progress, grades, certificates, price and roles
 *    (plugin endpoint). Orders stay as payment history.
 * 3. This server: the course's uploaded videos and the cached catalog.
 *
 * Safe to retry: when Studio no longer has the course, the remaining steps
 * still run.
 */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)

  const inStudio = await edxFetch(event, studioUrl(`/api/v1/course_runs/${edxKey(courseId)}/`)).then(() => true, (error) => {
    if (error.statusCode === 404) return false
    throw error
  })
  if (inStudio) {
    try {
      await edxFetch(event, studioUrl(`/campus/api/v1/courses/${edxKey(courseId)}/`), { method: 'DELETE' })
    }
    catch (error) {
      // The course exists, so a 404 means Studio doesn't have the endpoint.
      if ((error as { statusCode?: number }).statusCode === 404) {
        throw createError({
          statusCode: 501,
          statusMessage: 'Studio todavía no permite borrar cursos: actualiza la plataforma con make update.',
        })
      }
      throw error
    }
  }

  const { deleted } = await edxFetch<{ deleted: Record<string, number> }>(
    event,
    lmsApiUrl(`/payments/api/v1/courses/${edxKey(courseId)}/learner-data/`),
    { method: 'DELETE' },
  )

  await removeCourseVideos(courseId)

  // The public catalog and course page are cached for a minute; drop them now.
  const cache = useStorage('cache')
  const cached = await cache.getKeys('nitro:handlers:course')
  await Promise.all(cached.map(key => cache.removeItem(key)))

  return { id: courseId, deleted }
})
