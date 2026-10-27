/**
 * Serves uploaded videos. Supports Range requests, which browsers need to
 * seek and to start playing before the whole file arrives.
 */
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'

const CONTENT_TYPES: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg' }

export default defineEventHandler(async (event) => {
  // "{course folder}/{file}", or just "{file}" for uploads made before
  // videos were kept per course.
  const segments = (getRouterParam(event, 'path') ?? '').split('/')
  const file = segments.pop() ?? ''
  if (!VIDEO_FILE.test(file) || segments.length > 1 || (segments[0] && !VIDEO_FOLDER.test(segments[0]))) {
    throw createError({ statusCode: 404, statusMessage: 'Video no encontrado' })
  }
  const path = join(videoDir(), ...segments, file)
  let size: number
  try {
    size = (await stat(path)).size
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Video no encontrado' })
  }

  setResponseHeaders(event, {
    'accept-ranges': 'bytes',
    'content-type': CONTENT_TYPES[file.split('.').pop()!]!,
    // Names are random and never reused, so the content never changes.
    'cache-control': 'public, max-age=31536000, immutable',
  })

  const range = /^bytes=(\d*)-(\d*)$/.exec(getRequestHeader(event, 'range') ?? '')
  if (!range || (!range[1] && !range[2])) {
    setResponseHeader(event, 'content-length', size)
    return sendStream(event, createReadStream(path))
  }

  // "bytes=-500" is the last 500 bytes; "bytes=100-" runs to the end.
  const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0)
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
  if (start > end || start >= size) {
    setResponseStatus(event, 416)
    setResponseHeader(event, 'content-range', `bytes */${size}`)
    return null
  }
  setResponseStatus(event, 206)
  setResponseHeaders(event, {
    'content-range': `bytes ${start}-${end}/${size}`,
    'content-length': end - start + 1,
  })
  return sendStream(event, createReadStream(path, { start, end }))
})
