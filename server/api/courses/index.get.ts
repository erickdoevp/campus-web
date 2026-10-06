export default defineCachedEventHandler(() => listCourses(), {
  name: 'courses',
  maxAge: 60,
})
