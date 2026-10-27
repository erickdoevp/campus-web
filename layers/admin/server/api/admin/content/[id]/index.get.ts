/** The course outline (modules, lessons, units) and its assignment types. Not cached: authors expect their changes right away. */
export default defineEventHandler(event => getOutline(event, courseIdParam(event)))
