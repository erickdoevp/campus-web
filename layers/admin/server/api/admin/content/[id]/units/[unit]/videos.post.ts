/** Adds a video hosted elsewhere: a YouTube link or a direct MP4/WebM URL. */
export default defineEventHandler(async (event): Promise<ContentVideo> => {
  const courseId = courseIdParam(event)
  const unitId = unitIdParam(event, courseId)
  const body = await readBody<{ title?: string, url?: string }>(event)
  const title = readTitle(body?.title, 'Video')
  const link = typeof body?.url === 'string' ? body.url.trim() : ''

  const youtubeId = parseYoutubeId(link)
  if (youtubeId) return createVideo(event, courseId, unitId, title, { youtubeId })
  if (/^https?:\/\/\S+$/i.test(link) && link.length <= 2000) return createVideo(event, courseId, unitId, title, { url: link })
  throw createError({ statusCode: 400, statusMessage: 'Pega un enlace de YouTube o la URL de un archivo de video.' })
})
