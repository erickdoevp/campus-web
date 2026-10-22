export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const body = await readBody<{ price?: number | null }>(event)
  await setCoursePrice(event, courseId, readPrice(body?.price))
  return toPrice(await getVerifiedMode(event, courseId))
})
