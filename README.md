# campus-web

Public site (Nuxt 4) for the Open edX platform: course catalog, course pages
with the "Comprar" button, events, contact and the accountants' admin area.
Learning happens in Open edX; courses for sale, and their payments (Stripe),
are handled by the Campus CMS (`campus-cms`).

## Project structure

Feature-based, using [Nuxt layers](https://nuxt.com/docs/guide/going-further/layers):
each folder in `layers/` is auto-registered and holds everything for one
feature (pages, components, composables, utils, server routes, shared types).

| Folder | Contents |
|---|---|
| `app/` | App shell: `app.vue`, default layout, home page, global CSS and `app.config.ts`. |
| `layers/auth` | `useEdxUser`: the logged-in Open edX user, read from LMS cookies. Server side: `cmsRequest` (calls the CMS with the user's LMS JWT) and the middleware that refreshes that JWT. |
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
| "Comprar" button | Plain link to this site's `/comprar/{course_id}` (`layers/courses/server/routes`): sends anonymous users through the LMS login, asks the CMS for a Stripe Checkout as the user and redirects there (or into the course if already owned). Stripe brings them back to the course page, which waits for the access the CMS grants after the payment. |
| "Already bought" | `GET /api/courses/{id}/owned` asks the LMS enrollment API, with the user's LMS cookies, for an active `verified` enrollment. |
| Logged-in user in the header | Reads the `edxloggedin` / `edx-user-info` cookies the LMS sets on the parent domain (`useEdxUser`). The site must be on a subdomain of the LMS cookie domain. |
| Login / logout | Links to the LMS with `?next=` / `?redirect_url=` back to this site (the plugin's Tutor config whitelists it). |
| LMS course "About" pages | The plugin redirects them here (`/cursos/{course_id}`). |

## Admin area (`/admin`)

For contadores. The data lives in the Campus CMS (`campus-cms`); the browser
only talks to this site.

| Page | What it's for |
|---|---|
| `/admin` | Summary for a period (`?desde=&hasta=`): net sales, money in, refunds, sales, average ticket (vs the previous period), net sales per day/week, figures per course, and alerts for purchases whose access failed |
| `/admin/cursos` | Create courses, set price and image, create them in Open edX and put them on sale |
| `/admin/ventas` | Every order with its payment and access state (filters in the URL: `?estado=&acceso=&q=`); retry an access that failed |

| Piece | What it does |
|---|---|
| `server/api/admin/[...path].ts` | Proxies `/api/admin/*` to the CMS `/api/v1/*` (only the routes the admin uses), sending the user's LMS JWT as `Authorization: JWT …`, joined from the `edx-jwt-cookie-header-payload` + `edx-jwt-cookie-signature` cookies. Writes must come from this site's `Origin`. |
| `layers/auth/server/middleware/edx-jwt.ts` | The JWT cookies last an hour, the LMS session longer: on `/admin`, `/api/admin` and `/comprar` requests without them, it calls the LMS `POST /login_refresh` with the session cookie and passes the new cookies on. |
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
