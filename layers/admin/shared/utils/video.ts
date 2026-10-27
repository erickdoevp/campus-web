/** The 11-character video id from a YouTube link (watch, youtu.be, embed, shorts) or a bare id. */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim()
  if (/^[\w-]{11}$/.test(value)) return value
  const match = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})(?:[?&#/].*)?$/i.exec(value)
  return match ? match[1]! : null
}
