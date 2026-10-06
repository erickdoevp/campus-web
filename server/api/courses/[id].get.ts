export default defineCachedEventHandler(async (event) => {
  const id = getRouterParam(event, 'id', { decode: true })!
  const course = await getCourse(id)
  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Curso no encontrado' })
  }
  return course
}, {
  name: 'course',
  maxAge: 60,
  getKey: event => getRouterParam(event, 'id', { decode: true })!,
})
