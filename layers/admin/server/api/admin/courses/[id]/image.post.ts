const IMAGE_TYPES = ['image/jpeg', 'image/png']
const MAX_IMAGE_BYTES = 5 * 1024 ** 2

/** Course card image (JPEG or PNG), stored by Studio as the course image. */
export default defineEventHandler(async (event) => {
  const courseId = courseIdParam(event)
  requireStaff(event)
  const image = (await readMultipartFormData(event))?.find(part => part.name === 'image')
  if (!image?.data.length || !IMAGE_TYPES.includes(image.type ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Sube una imagen JPG o PNG.' })
  }
  if (image.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'La imagen pesa más de 5 MB.' })
  }
  const form = new FormData()
  form.append('card_image', new Blob([new Uint8Array(image.data)], { type: image.type }), image.filename ?? 'portada')
  const saved = await edxFetch<{ card_image: string }>(event, studioUrl(`/api/v1/course_runs/${edxKey(courseId)}/images/`), {
    method: 'POST',
    body: form,
  })
  return { image: saved.card_image }
})
