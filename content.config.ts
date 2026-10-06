import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    // One Markdown file per event in content/eventos/.
    eventos: defineCollection({
      type: 'page',
      source: 'eventos/*.md',
      schema: z.object({
        date: z.string().datetime({ offset: true }),
        location: z.string(),
        modality: z.enum(['Presencial', 'En línea', 'Híbrido']),
        registrationUrl: z.string().url().optional(),
      }),
    }),
  },
})
