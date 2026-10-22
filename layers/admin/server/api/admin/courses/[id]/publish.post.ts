/** Publishes every module with pending changes, lessons and videos included. */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  const course = await getAdminCourse(event, courseId)
  // One at a time: parallel publishes contend for the same course in the modulestore.
  for (const module of course.modules) {
    if (module.hasChanges || module.lessons.some(lesson => lesson.hasChanges)) {
      await updateBlock(event, courseId, module.id, { publish: 'make_public' })
    }
  }
  return getAdminCourse(event, courseId)
})
