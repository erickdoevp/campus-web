/**
 * Uploads a video file (the raw request body, typed by Content-Type) and adds
 * it to the unit: PUT /api/admin/content/{id}/units/{unit}/videos?title=...
 */
export default defineEventHandler(async (event): Promise<ContentVideo> => {
  const courseId = courseIdParam(event)
  const unitId = unitIdParam(event, courseId)
  const title = readTitle(getQuery(event).title, 'Video')

  // Studio checks the JWT and the user's access to the course before we
  // accept any bytes: this route writes to our disk, not to Open edX.
  await getBlock(event, courseId, unitId)

  const contentType = (getRequestHeader(event, 'content-type') ?? '').split(';')[0]!.trim()
  const file = await storeVideo(event, courseId, contentType)
  try {
    return await createVideo(event, courseId, unitId, title, { url: videoUrl(event, file) })
  }
  catch (error) {
    await removeVideo(file)
    throw error
  }
})
