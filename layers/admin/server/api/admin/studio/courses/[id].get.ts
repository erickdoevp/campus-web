/**
 * Dates, pacing and short description of an Open edX course, to prefill the
 * CMS product that takes it. Only Studio's course details: unlike the course
 * run API, course authors (not just staff) can read it.
 */
export default defineEventHandler(async (event): Promise<StudioCourseDetails> => {
  const details = await getCourseDetails(event, courseIdParam(event))
  return {
    shortDescription: details.short_description ?? '',
    start: details.start_date,
    end: details.end_date,
    pacing: details.self_paced ? 'self' : 'instructor',
  }
})
