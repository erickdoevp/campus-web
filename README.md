# campus-web

Public site (Nuxt 4) for the Open edX platform: course catalog, course pages
with the "Comprar" button, events, contact and the accountants' admin area.
Learning happens in Open edX; courses for sale come from the Campus CMS
(`campus-cms`); payments are handled by the `openedx-course-payments` LMS plugin.

## Project structure

Feature-based, using [Nuxt layers](https://nuxt.com/docs/guide/going-further/layers):
each folder in `layers/` is auto-registered and holds everything for one
feature (pages, components, composables, utils, server routes, shared types).

| Folder | Contents |
|---|---|
| `app/` | App shell: `app.vue`, default layout, home page, global CSS and `app.config.ts`. |
| `layers/auth` | `useEdxUser`: the logged-in Open edX user, read from LMS cookies. |
| `layers/courses` | Catalog and course pages, `CourseCard`, `/api/courses` routes, catalog client (`server/utils/catalog.ts`: CMS + LMS), `CourseSummary`/`CourseDetail` types. |
| `layers/events` | Events pages, `EventCard`, date helpers for Nuxt Content. |
| `layers/contact` | `POST /api/contact`. |
| `layers/admin` | Admin area for contadores (`/admin`): courses, prices and sale status, backed by the Campus CMS through `/api/admin/*`. |

Auto-imports work across layers, so a feature can use another's components,
composables and utils without imports. Event Markdown stays in `content/` with
its collection in `content.config.ts`.

## How it connects to Open edX

| Need | How |
|---|---|
| Course list and details | Nitro server routes (`layers/courses/server/api/courses`), cached 60 s, join two sources: the CMS public catalog (which courses are on sale, title, descriptions, image, price) and the LMS Course API (dates, pacing, effort, owned by Studio). Only CMS courses on sale are listed; archived ones keep their page, marked as no longer for sale. Changes made in `/admin` clear that cache right away. The browser never calls these APIs directly, so no CORS. |
| "Comprar" button | Plain link to `{LMS}/payments/buy/{course_id}/`. The LMS handles login, creates the order and redirects to Stripe (or into the course if already owned). |
| Logged-in user in the header | Reads the `edxloggedin` / `edx-user-info` cookies the LMS sets on the parent domain (`useEdxUser`). The site must be on a subdomain of the LMS cookie domain. |
| Login / logout | Links to the LMS with `?next=` / `?redirect_url=` back to this site (the plugin's Tutor config whitelists it). |
| LMS course "About" pages | The plugin redirects them here (`/cursos/{course_id}`). |

## Admin area (`/admin`)

For contadores: create courses, set their price and image, create them in
Open edX and put them on sale. The data lives in the Campus CMS (`campus-cms`);
the browser only talks to this site.

| Piece | What it does |
|---|---|
| `server/api/admin/[...path].ts` | Proxies `/api/admin/*` to the CMS `/api/v1/*` (only the routes the admin uses), sending the user's LMS JWT as `Authorization: JWT …`, joined from the `edx-jwt-cookie-header-payload` + `edx-jwt-cookie-signature` cookies. Writes must come from this site's `Origin`. |
| `server/middleware/edx-jwt.ts` | The JWT cookies last an hour, the LMS session longer: on `/admin` and `/api/admin` requests without them, it calls the LMS `POST /login_refresh` with the session cookie and passes the new cookies on. |
| `app/middleware/admin.ts` | Anonymous users go to the LMS login and come back; users without the Contador role get a 403. The CMS checks the role on every call too. |

The role is given in the CMS:
`make tutor ARGS="dev exec campus-cms python manage.py contador <username>"`.
Contadores see an "Administración" link in the site header.

Behind a reverse proxy in production, configure it so `getRequestURL()` sees
the public host (the `Origin` check compares against it).

## Development

Requires the Tutor dev stack running (`tutor dev start -d`, which also runs the
CMS for the admin area) and Node >= 22.5.

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

- Contact form only logs messages (`layers/contact/server/api/contact.post.ts`); connect an e-mail provider.
