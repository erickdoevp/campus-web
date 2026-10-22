interface StudioHomeCourse {
  course_key: string
  display_name: string
  org: string
  number: string
  run: string
}

/** Every course the user can edit in Studio, with its price. Not cached: admins expect their changes right away. */
export default defineEventHandler(async (event): Promise<AdminCourseSummary[]> => {
  const home = await edxFetch<{ courses: StudioHomeCourse[] }>(event, studioUrl('/api/contentstore/v1/home/courses'))
  const modes = await Promise.all(home.courses.map(c => getVerifiedMode(event, c.course_key).catch(() => null)))
  return home.courses.map((course, i) => ({
    id: course.course_key,
    name: course.display_name,
    org: course.org,
    number: course.number,
    run: course.run,
    ...toPrice(modes[i]!),
  }))
})
