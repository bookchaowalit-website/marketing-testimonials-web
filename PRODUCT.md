# Testimonials — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `testimonials`, evidence Live→Prototype: the
> client submission form, admin approval workflow, star ratings and reusable embed component were removed) on
> 2026-10-23.

## What it is

A client-only list of testimonial quotes kept in this browser's `localStorage`, with a copy-HTML export.

## Who it is for

A freelancer curating a few client quotes for their own site, and a portfolio visitor looking at the UI.

## What works today

1. One seed quote (Alex, Featured). Add quotes with an author (≤ 80) and quote (≤ 600) in state Featured, Review or
   Archive; blank or invisible-only input shows an error.
2. Search by author, quote or state; change a quote's state; remove it.
3. "Embed the featured quotes" shows HTML-escaped markup of every Featured quote, with a copy button (and a message
   if the browser blocks the clipboard).
4. Stored quotes are validated on load: bad JSON, unknown states and duplicate ids are dropped.
5. `/api/mcp` answers JSON-RPC (`initialize`, `ping`, `tools/list`, `tools/call`) with one honest `get_app_info` tool;
   unknown tools and methods return JSON-RPC errors.
6. Front-end and server errors go to Sentry (errors only, personal data stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No client submission form, approval workflow, star ratings or hosted embed; the embed is static HTML you paste.
- No account, sharing or sync; clearing site data deletes the quotes.

## Live URL and deploy state

- Live: https://testimonials.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-testimonials-frontend` is deployed by CLI only. Its Git link names the old
  repository (`bookchaowalit/bookchaowalit-testimonials-frontend`), so a push to `main` does not deploy. The last
  production deploy is the CVE patch (2026-10-23 12:29, CLI, commit e6bce26); later commits (tests, Sentry, canonical
  origin and a11y fixes) stay undeployed until the coordinator's next deploy (Vercel's daily deploy quota was used up on
  2026-10-23) or the owner reconnects Vercel Git to this repository (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `marketing-testimonials-web`, org
  `personal-yu0`); it takes effect on the next deploy.

## Boundaries

- Browser-only apart from the stateless `/api/mcp` route. No server storage, no personal data collected.
