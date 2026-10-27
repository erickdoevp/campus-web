/** Publishes every module with pending changes, lessons, videos and evaluations included. */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  await publishCourse(event, courseId)
  return getOutline(event, courseId)
})
