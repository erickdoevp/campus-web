/**
 * Uploaded videos live on this server's disk, one folder per course, and are
 * served by /media/videos/{folder}/{file}. File names are random UUIDs, so
 * they can't be guessed, but anyone with the link can watch: fine for course
 * videos, not for secrets.
 */
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { H3Event } from 'h3'

export const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
}

export const VIDEO_FILE = /^[0-9a-f-]{36}\.(mp4|webm|ogv)$/

export const VIDEO_FOLDER = /^course-v1_[\w.+-]+$/

export const MAX_VIDEO_BYTES = 2 * 1024 ** 3

export function videoDir() {
  return resolve(useRuntimeConfig().adminVideoDir)
}

/** "course-v1:Org+Num+Run" → "course-v1_Org+Num+Run". */
export function courseVideoFolder(courseId: string) {
  return courseId.replace(/[^\w.+-]/g, '_')
}

/**
 * Streams the request body to disk without buffering it in memory and
 * returns the stored path, "{folder}/{file}". Partial files are removed on
 * failure.
 */
export async function storeVideo(event: H3Event, courseId: string, contentType: string): Promise<string> {
  const ext = VIDEO_TYPES[contentType]
  if (!ext) {
    throw createError({ statusCode: 415, statusMessage: 'Formato no soportado. Sube un video MP4, WebM u Ogg.' })
  }
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > MAX_VIDEO_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'El video pesa más de 2 GB.' })
  }

  const folder = courseVideoFolder(courseId)
  const dir = join(videoDir(), folder)
  await mkdir(dir, { recursive: true })
  const file = `${randomUUID()}.${ext}`
  const partial = join(dir, `${file}.part`)

  let received = 0
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length
      callback(received > MAX_VIDEO_BYTES ? createError({ statusCode: 413, statusMessage: 'El video pesa más de 2 GB.' }) : null, chunk)
    },
  })
  try {
    await pipeline(event.node.req, limit, createWriteStream(partial))
    if (!received) throw createError({ statusCode: 400, statusMessage: 'El archivo está vacío.' })
    await rename(partial, join(dir, file))
  }
  catch (error) {
    await rm(partial, { force: true })
    throw error
  }
  return `${folder}/${file}`
}

export function removeVideo(path: string) {
  return rm(join(videoDir(), path), { force: true })
}

/** Every video uploaded for the course, including ones already removed from it. */
export function removeCourseVideos(courseId: string) {
  return rm(join(videoDir(), courseVideoFolder(courseId)), { recursive: true, force: true })
}

/** Absolute URL students' browsers load the video from. */
export function videoUrl(event: H3Event, path: string) {
  const base = useRuntimeConfig().adminVideoBaseUrl || `${getRequestURL(event).origin}/media/videos`
  return `${base.replace(/\/$/, '')}/${path}`
}
