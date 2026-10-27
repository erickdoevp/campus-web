/**
 * Deletes a module, lesson, unit, video or evaluation from the draft; students
 * keep seeing it until the course is published. Uploaded files are kept for
 * that reason.
 */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const blockId = blockIdParam(event, courseId, 'block')
  if (blockId === courseRootId(courseId)) {
    throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
  }
  await deleteBlock(event, courseId, blockId)
  setResponseStatus(event, 204)
  return null
})
