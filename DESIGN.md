# Testimonials — design direction

## Product surface

Collect client quotes in this browser, choose which are Featured, and copy the Featured ones as
static, escaped HTML for another site. Nothing is published and no quote is invented.

## System (2026-11-19)

The site uses the shared **App shell** (`app/app-shell.css`, `components/app-shell.tsx`, see
`APP-SHELL.md`), copied byte-identical from productivity-ideas-web. Colours are the shell's `--as-*`
tokens in light and dark (the darkroom rust/paper theme and its 4.4:1 rust are gone; Archive no
longer fades the card with opacity). `.tm-*` additions in `app/globals.css` reuse those tokens.
Typography is Geist via `next/font`.

- Lists: All quotes, Featured, Review, Archive with counts; search in the head; a "Local demo ·
  saved in this browser only" pill stays under the title at every width.
- One filled button: New quote. The composer reminds the user to add only real, permitted words.
- Rows: author, the full quote, a 44px state select, a state pill (text, not colour alone), and
  Remove with Undo.
- Truthfulness: the only seeded row is "Sample client", labelled "Example only · not a real
  testimonial", and it starts in Review so it never reaches the embed by itself.
- Empty states for nothing yet, an empty list, and no match (with Clear search).
- Footer back to bookchaowalit.com; `/more-projects` redirects there. No analytics scripts.
- Floor: text >= 12px, controls >= 44px, 3px focus ring, 4.5:1 text, 3:1 input edges, no horizontal scroll at 320px.
