/** Renames a module, lesson, unit or video. */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const blockId = blockIdParam(event, courseId, 'block')
  const body = await readBody<{ title?: string }>(event)
  const title = readTitle(body?.title)
  await updateBlock(event, courseId, blockId, { metadata: { display_name: title } })
  return { id: blockId, title }
})
