/** The unit's videos, evaluations and other components, in course order. */
export default defineEventHandler((event) => {
  const courseId = courseIdParam(event)
  return getUnitComponents(event, courseId, unitIdParam(event, courseId))
})
