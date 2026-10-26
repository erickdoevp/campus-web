/**
 * Adds a module, a lesson or a unit. A new lesson gets one unit right away,
 * so videos and evaluations can be added to it.
 */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const body = await readBody<Partial<ContentBlockInput>>(event)
  const title = readTitle(body?.title)

  if (body?.kind === 'module') {
    return { id: await createBlock(event, courseId, courseRootId(courseId), 'chapter', title) }
  }

  const parentId = body && 'parentId' in body ? body.parentId ?? '' : ''
  if (body?.kind === 'lesson' && isBlockOf(courseId, parentId) && parentId.includes('+type@chapter+')) {
    const id = await createBlock(event, courseId, parentId, 'sequential', title)
    const unitId = await createBlock(event, courseId, id, 'vertical', title)
    return { id, unitIds: [unitId] }
  }
  if (body?.kind === 'unit' && isBlockOf(courseId, parentId) && parentId.includes('+type@sequential+')) {
    return { id: await createBlock(event, courseId, parentId, 'vertical', title) }
  }
  throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
})
