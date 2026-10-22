const KEY_PART = /^[A-Za-z0-9_.-]{1,64}$/

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<AdminCourseCreateInput>>(event)
  const name = readTitle(body?.name)
  const org = body?.org?.trim() ?? ''
  const number = body?.number?.trim() ?? ''
  const run = body?.run?.trim() ?? ''
  if (![org, number, run].every(part => KEY_PART.test(part))) {
    throw createError({ statusCode: 400, statusMessage: 'Organización, número y edición solo aceptan letras, números, guiones, puntos y guiones bajos.' })
  }
  const start = readDate(body?.start)
  const price = readPrice(body?.price)
  const courseId = `course-v1:${org}+${number}+${run}`

  // Studio answers a duplicate with a 500, so check first.
  const exists = await edxFetch(event, studioUrl(`/api/v1/course_runs/${edxKey(courseId)}/`)).then(() => true, (error) => {
    if (error.statusCode === 404) return false
    throw error
  })
  if (exists) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe un curso con esa organización, número y edición.' })
  }

  await edxFetch(event, studioUrl('/api/v1/course_runs/'), {
    method: 'POST',
    body: { title: name, org, number, run, pacing_type: body?.pacing === 'instructor' ? 'instructor_paced' : 'self_paced' },
  })

  // The course exists from here on: report what's left instead of failing.
  const pending: string[] = []
  if (start) {
    try {
      const details = await getCourseDetails(event, courseId)
      await putCourseDetails(event, courseId, { ...details, start_date: start })
    }
    catch {
      pending.push('la fecha de inicio')
    }
  }
  if (price) {
    await setCoursePrice(event, courseId, price).catch(() => pending.push('el precio'))
  }
  setResponseStatus(event, 201)
  return { id: courseId, pending }
})
