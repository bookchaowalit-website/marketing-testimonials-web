# Testimonials

A browser-only "proof room" for client quotes: add a quote with author and state (Featured, Review, Archive), search
and re-state the contact sheet, remove quotes, and copy static, escaped embed HTML of the Featured ones. Quotes live in
this browser's `localStorage`; nothing is published or collected from clients.

Live: https://testimonials.bookchaowalit.com (deployed by Vercel CLI; it can lag `main`, see `PRODUCT.md`).

## What it does

- Add a quote (author up to 80 characters, quote up to 600); invisible-only input is rejected, emoji stay whole.
- Search by author, quote or state; change a quote's state; remove it.
- "Embed the featured quotes": HTML-escaped markup of every Featured quote, with a copy button.
- Saved quotes are validated on load (bad JSON, unknown states and duplicate ids dropped).

## What it does not do

- No client submission form, approval workflow, star ratings, account or hosted embed component.

## Run

```bash
npm ci
npm run dev
```

## Checks

```bash
npm test           # Vitest: quote rules + embed escaping, MCP handler + route, site/robots/sitemap, home render, Sentry
npm run lint
npm run typecheck
npm run build
```

CI (`.github/workflows/ci.yml`) runs the shared Node workflow (with a line-coverage gate) and the shared security
scan on every push and PR to `main`.

## Configuration

- `NEXT_PUBLIC_SITE_URL` (optional): canonical origin for metadata, `/sitemap.xml`, `/robots.txt` and the MCP app
  info. Defaults to `https://testimonials.bookchaowalit.com`; must be an absolute http(s) URL.
- `NEXT_PUBLIC_SENTRY_DSN` (optional): turns on error reporting; unset means Sentry is off.

## Code map

- `lib/testimonials.ts`: quote rules, search, stored-quote parsing and the escaped embed HTML (used by the page).
- `lib/use-stored-state.ts`: state mirrored to `localStorage`, read after mount.
- `lib/mcp.ts` + `app/api/mcp/route.ts`: JSON-RPC endpoint with one `get_app_info` tool (static app descriptor; the
  quotes live only in the visitor's browser, so there is nothing else to serve).
- `lib/site.ts`: canonical URL, robots and sitemap.
- `lib/sentry.ts` + `instrumentation*.ts`: error reporting to Sentry, errors only, personal data stripped.
- `lib/related-projects.ts` + `app/more-projects/page.tsx`: portfolio link page (copied per repository, not a package).
