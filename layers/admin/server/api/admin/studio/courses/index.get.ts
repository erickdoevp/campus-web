interface StudioHomeCourse {
  course_key: string
  display_name: string
  org: string
  number: string
  run: string
}

/** The Open edX courses the user can edit in Studio, to take one into the CMS. */
export default defineEventHandler(async (event): Promise<StudioCourse[]> => {
  const home = await edxFetch<{ courses: StudioHomeCourse[] }>(event, studioUrl('/api/contentstore/v1/home/courses'))
  return home.courses.map(course => ({
    id: course.course_key,
    name: course.display_name,
    org: course.org,
    number: course.number,
    run: course.run,
  }))
})
