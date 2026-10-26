/**
 * Renames a module, lesson, unit, video or evaluation. For a lesson it also
 * sets whether it's graded (assignment type) and its deadline.
 */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const blockId = blockIdParam(event, courseId, 'block')
  const body = await readBody<{ title?: string, grading?: LessonGradingInput }>(event) ?? {}

  if (body.title !== undefined) {
    await updateBlock(event, courseId, blockId, { metadata: { display_name: readTitle(body.title) } })
  }
  if (body.grading !== undefined) {
    if (!blockId.includes('+type@sequential+')) {
      throw createError({ statusCode: 400, statusMessage: 'Solo las lecciones se califican.' })
    }
    const format = body.grading?.format
    if (format != null && (typeof format !== 'string' || !format.trim() || format.length > 100)) {
      throw createError({ statusCode: 400, statusMessage: 'Tipo de calificación inválido' })
    }
    const due = format ? readDate(body.grading?.due) : null
    // Studio's "notgraded" takes the lesson out of the grade; a null due date clears it.
    await updateBlock(event, courseId, blockId, { graderType: format || 'notgraded', metadata: { due } })
  }
  return { id: blockId }
})
