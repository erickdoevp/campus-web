# campus-web

Public site (Nuxt 4) for the Open edX platform: course catalog, course pages
with the "Comprar" button, events and contact. Learning happens in Open edX;
payments are handled by the `openedx-course-payments` LMS plugin.

## How it connects to Open edX

| Need | How |
|---|---|
| Course list and details | Nitro server routes (`server/api/courses`) call the LMS Course API and the plugin's price endpoint, cached 60 s. The browser never calls the LMS APIs directly, so no CORS. |
| "Comprar" button | Plain link to `{LMS}/payments/buy/{course_id}/`. The LMS handles login, creates the order and redirects to Stripe (or into the course if already owned). |
| Logged-in user in the header | Reads the `edxloggedin` / `edx-user-info` cookies the LMS sets on the parent domain (`useEdxUser`). The site must be on a subdomain of the LMS cookie domain. |
| Login / logout | Links to the LMS with `?next=` / `?redirect_url=` back to this site (the plugin's Tutor config whitelists it). |
| LMS course "About" pages | The plugin redirects them here (`/cursos/{course_id}`). |

## Development

Requires the Tutor dev stack running (`tutor dev start -d`) and Node >= 22.5.

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Open **http://www.local.openedx.io:3000** (not `localhost`): `*.local.openedx.io`
resolves to 127.0.0.1 and shares cookies with the LMS.

```bash
npx nuxi typecheck
```

## Content

Events are Markdown files in `content/eventos/` (schema in `content.config.ts`):

```md
---
title: Feria de cursos 2026
description: Short summary for cards and SEO.
date: "2026-12-03T10:00:00-06:00"   # quoted, with offset
location: Ciudad de México
modality: Presencial               # Presencial | En línea | Híbrido
registrationUrl: https://...       # optional
---

Body in Markdown.
```

## Configuration

Defaults in `nuxt.config.ts` target the Tutor dev stack. Override per environment:

| Env var | Purpose |
|---|---|
| `NUXT_OPENEDX_LMS_URL` | LMS URL used by the Nuxt server |
| `NUXT_PUBLIC_LMS_URL` | LMS URL used in browser links |
| `NUXT_PUBLIC_LEARNER_DASHBOARD_URL` | "Mis cursos" link |
| `NUXT_PUBLIC_LEARNING_MFE_URL` | Learning MFE base URL |

## Pending

- Contact form only logs messages (`server/api/contact.post.ts`); connect an e-mail provider.
