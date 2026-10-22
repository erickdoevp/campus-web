export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const body = await readBody<AdminCourseUpdateInput>(event) ?? {}

  if (body.name !== undefined) {
    await edxFetch(event, studioUrl(`/api/v1/course_runs/${edxKey(courseId)}/`), {
      method: 'PATCH',
      body: { title: readTitle(body.name) },
    })
  }

  const detailFields = ['shortDescription', 'overview', 'effort', 'start', 'end', 'pacing'] as const
  if (detailFields.some(field => body[field] !== undefined)) {
    const details = await getCourseDetails(event, courseId)
    if (body.shortDescription !== undefined) details.short_description = readText(body.shortDescription, 1000)
    if (body.overview !== undefined) details.overview = readText(body.overview, 100_000)
    if (body.effort !== undefined) details.effort = readText(body.effort, 60)
    if (body.start !== undefined) {
      details.start_date = readDate(body.start)
      if (!details.start_date) throw createError({ statusCode: 400, statusMessage: 'El curso necesita fecha de inicio.' })
    }
    if (body.end !== undefined) details.end_date = readDate(body.end)
    if (body.pacing !== undefined) details.self_paced = body.pacing === 'self'
    if (details.start_date && details.end_date && details.end_date <= details.start_date) {
      throw createError({ statusCode: 400, statusMessage: 'La fecha de fin debe ser posterior a la de inicio.' })
    }
    await putCourseDetails(event, courseId, details)
  }

  if (body.visible !== undefined) {
    await edxFetch(event, studioUrl(`/api/contentstore/v0/advanced_settings/${edxKey(courseId)}`), {
      method: 'PATCH',
      body: { catalog_visibility: { value: body.visible ? 'both' : 'none' } },
    })
  }

  return getAdminCourse(event, courseId)
})
