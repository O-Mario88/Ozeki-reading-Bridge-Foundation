# Ozeki Reading Bridge Foundation Web App

Full-stack Next.js web application for Ozeki Reading Bridge Foundation.

## Stack
- Next.js 16 (App Router, TypeScript)
- SQLite (`better-sqlite3`) for backend persistence
- REST-style API routes for booking, contact, downloads, impact, blog, and resources

## Implemented Website Structure
- Home
- About
- Programs & Services
- Signature Program (`/phonics-training`)
- 1001 Story Project (`/story-project`)
- Impact
- Resources Library (filter/search + lead capture + downloads)
- Blog (categories, search, author profile, TOC on article pages)
- Free Phonics Diagnostic Quiz
- Events & Webinars
- Book a Visit (appointment form)
- Partner With Us
- Contact (form + WhatsApp link)
- Case Studies
- Testimonials
- Partners
- Media
- Transparency
- Academy (premium portal concept page)
- Pricing
- For Teachers
- For Schools

## Dynamic Backend Features
- `POST /api/bookings`:
  Stores school booking requests.
- `POST /api/contacts`:
  Stores school/partner/media/general inquiries.
- `POST /api/downloads`:
  Captures resource leads and download intent.
- `GET /api/impact`:
  Returns dashboard metrics + engagement counters.
- `POST /api/newsletter`:
  Captures weekly tip newsletter subscribers.
- `GET /api/blog`:
  Returns blog summaries.
- `GET /api/resources`:
  Returns resource catalog.

SQLite database file is created at `data/app.db`.

## SEO & Technical Setup
- Clean routes for all core pages
- Metadata per page
- Structured data (Organization and FAQ JSON-LD on key pages)
- Auto-generated `sitemap.xml` and `robots.txt`
- Mobile-first responsive UI

## Local Development
1. Install dependencies:
```bash
npm install
```
2. Run dev server:
```bash
npm run dev
```
3. Open:
```text
http://localhost:3000
```

## Quality Checks
```bash
npm run lint
npm run build
```

Both commands currently pass.
