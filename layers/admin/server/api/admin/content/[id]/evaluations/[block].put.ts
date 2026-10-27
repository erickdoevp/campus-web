/** Saves an evaluation written in Campus (a "problem" block): PUT …/evaluations/{block}?unit={unit}. */
export default defineEventHandler(async (event): Promise<ContentEvaluation> => {
  const courseId = courseIdParam(event)
  const blockId = blockIdParam(event, courseId, 'block')
  if (!blockId.includes('+type@problem+')) {
    throw createError({ statusCode: 400, statusMessage: 'Esta evaluación se edita en Studio.' })
  }
  const unitId = String(getQuery(event).unit ?? '')
  if (!isBlockOf(courseId, unitId) || !unitId.includes('+type@vertical+')) {
    throw createError({ statusCode: 400, statusMessage: 'Elemento inválido' })
  }
  return updateEvaluation(event, courseId, blockId, unitId, await readEvaluation(event))
})
