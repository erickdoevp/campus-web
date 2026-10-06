interface ContactMessage {
  name: string
  email: string
  message: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<ContactMessage>>(event)
  const name = body?.name?.trim() ?? ''
  const email = body?.email?.trim() ?? ''
  const message = body?.message?.trim() ?? ''

  if (!name || name.length > 120 || !EMAIL.test(email) || email.length > 200 || !message || message.length > 4000) {
    throw createError({ statusCode: 400, statusMessage: 'Datos inválidos' })
  }

  // TODO: deliver the message (e-mail provider or helpdesk). Until then it is
  // only logged on the server.
  console.info('[contact]', { name, email, message })
  return { ok: true }
})
