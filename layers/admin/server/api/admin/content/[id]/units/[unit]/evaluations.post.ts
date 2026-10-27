/**
 * Adds an evaluation to the unit. Either one Campus writes (body: an
 * EvaluationInput) or, with `{ studioKind, title }`, one of the types Studio
 * edits, created with Studio's defaults.
 */
export default defineEventHandler(async (event): Promise<ContentEvaluation> => {
  const courseId = courseIdParam(event)
  const unitId = unitIdParam(event, courseId)
  const body = await readBody<{ studioKind?: string, title?: string }>(event)
  if (body?.studioKind !== undefined) {
    if (!(body.studioKind in STUDIO_EVALUATION_KINDS)) {
      throw createError({ statusCode: 400, statusMessage: 'Tipo de evaluación inválido' })
    }
    const kind = body.studioKind as StudioEvaluationKind
    return createStudioEvaluation(event, courseId, unitId, kind, readTitle(body.title, STUDIO_EVALUATION_KINDS[kind].label))
  }
  return createEvaluation(event, courseId, unitId, await readEvaluation(event))
})
