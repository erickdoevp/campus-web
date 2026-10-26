# campus-web

Public site (Nuxt 4) for the Open edX platform: course catalog, course pages
with the "Comprar" button, events and contact. Learning happens in Open edX;
payments are handled by the `openedx-course-payments` LMS plugin.

## Project structure

Feature-based, using [Nuxt layers](https://nuxt.com/docs/guide/going-further/layers):
each folder in `layers/` is auto-registered and holds everything for one
feature (pages, components, composables, utils, server routes, shared types).

| Folder | Contents |
|---|---|
| `app/` | App shell: `app.vue`, default layout, home page, global CSS and `app.config.ts`. |
| `layers/auth` | `useEdxUser`: the logged-in Open edX user, read from LMS cookies. |
| `layers/courses` | Catalog and course pages, `CourseCard`, `/api/courses` routes, Open edX client (`server/utils/openedx.ts`), `CourseSummary`/`CourseDetail` types. |
| `layers/events` | Events pages, `EventCard`, date helpers for Nuxt Content. |
| `layers/contact` | `POST /api/contact`. |
| `layers/admin` | `/admin` for Open edX staff: create courses, modules, lessons and videos, price and catalog visibility. `/api/admin/*` routes call Studio and the LMS as the user (`server/utils/edx.ts`); uploaded videos are served from `/media/videos`. |

Auto-imports work across layers, so a feature can use another's components,
composables and utils without imports. Event Markdown stays in `content/` with
its collection in `content.config.ts`.

## How it connects to Open edX

| Need | How |
|---|---|
| Course list and details | Nitro server routes (`layers/courses/server/api/courses`) call the LMS Course API and the plugin's price endpoint, cached 60 s. The browser never calls the LMS APIs directly, so no CORS. |
| "Comprar" button | Plain link to `{LMS}/payments/buy/{course_id}/`. The LMS handles login, creates the order and redirects to Stripe (or into the course if already owned). |
| Logged-in user in the header | Reads the `edxloggedin` / `edx-user-info` cookies the LMS sets on the parent domain (`useEdxUser`). The site must be on a subdomain of the LMS cookie domain. |
| Login / logout | Links to the LMS with `?next=` / `?redirect_url=` back to this site (the plugin's Tutor config whitelists it). |
| LMS course "About" pages | The plugin redirects them here (`/cursos/{course_id}`). |
| Admin area (`/admin`) | Server routes join the LMS JWT cookies into an `Authorization: JWT` header and call Studio (courses, outline, video components, details) and the LMS (`verified` course mode = price). Open edX checks the token and the user's permissions on every call; only staff users (`is_staff`) get in. |
| Videos | Uploaded to this server's disk (`NUXT_ADMIN_VIDEO_DIR`, one folder per course) and added to the lesson as an Open edX video component pointing at `/media/videos/{file}`. YouTube links and external MP4 URLs work too. New or edited content is a draft until "Publicar cambios". |
| Deleting a course | `DELETE /api/admin/courses/{id}` calls the `openedx-course-payments` endpoints in Studio (content) and the LMS (enrollments, progress, grades, certificates, price, roles), then deletes the course's video folder and the cached catalog. Payment orders are kept. |

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
| `NUXT_OPENEDX_STUDIO_URL` | Studio URL used by the Nuxt server (admin area) |
| `NUXT_PUBLIC_STUDIO_URL` | Studio URL used in admin links |
| `NUXT_ADMIN_VIDEO_DIR` | Where uploaded videos are stored (default `.data/videos`) |
| `NUXT_ADMIN_VIDEO_BASE_URL` | Public URL of that folder if served elsewhere (default: this site's `/media/videos`) |

## Pending

- Contact form only logs messages (`layers/contact/server/api/contact.post.ts`); connect an e-mail provider.
- Uploaded videos live on the Nuxt server's disk: back up `.data/videos`, or move them to object storage (S3) and set `NUXT_ADMIN_VIDEO_BASE_URL` for production. Files of deleted videos are kept until the course is deleted, since published content may still use them.
