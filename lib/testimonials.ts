export const STATES = ["Featured", "Review", "Archive"] as const;
export type State = (typeof STATES)[number];
export type Quote = { id: string; author: string; quote: string; state: State };

export const MAX_AUTHOR = 80;
export const MAX_QUOTE = 600;

const ORDER: Record<State, number> = { Featured: 0, Review: 1, Archive: 2 };

/** Search across author, quote and state; featured proofs sort first, stable otherwise. */
export function visibleQuotes(quotes: Quote[], query: string): Quote[] {
  const needle = query.trim().toLowerCase();
  return quotes
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => `${item.author} ${item.quote} ${item.state}`.toLowerCase().includes(needle))
    .sort((a, b) => ORDER[a.item.state] - ORDER[b.item.state] || a.index - b.index)
    .map(({ item }) => item);
}

const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF]/g;

/** Trim, drop zero-width characters / BOM, cut to `max` UTF-16 units without splitting an emoji. */
function clean(text: string, max: number): string {
  const value = text.replace(INVISIBLE, "").trim();
  if (value.length <= max) return value;
  return value.slice(0, /[\uD800-\uDBFF]/.test(value[max - 1]) ? max - 1 : max).trimEnd();
}

export function createQuote(author: string, quote: string, state: State, id: string): Quote | { error: string } {
  const cleanAuthor = clean(author, MAX_AUTHOR);
  const cleanQuote = clean(quote.replace(INVISIBLE, "").trim().replace(/^["“”]+|["“”]+$/g, ""), MAX_QUOTE);
  if (!cleanAuthor || !cleanQuote) return { error: "Add both an author and a quote before exposing it." };
  return { id, author: cleanAuthor, quote: cleanQuote, state };
}

export function isState(value: unknown): value is State {
  return typeof value === "string" && (STATES as readonly string[]).includes(value);
}

// The invented quote earlier versions seeded as Featured. Browsers that ran them still hold it; it is dropped on
// read so it never shows unlabelled or reaches the embed. Matched on id, author and words so a real quote stays.
const LEGACY_SAMPLE = { id: "alex", author: "Alex", quote: "Shipped faster than expected." };
const isLegacySample = (q: Record<string, unknown>) => q.id === LEGACY_SAMPLE.id && q.author === LEGACY_SAMPLE.author && q.quote === LEGACY_SAMPLE.quote;

export function parseQuotes(raw: string | null): Quote[] | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    // Ids key the rows and every edit; a repeated id keeps only its first quote.
    const seen = new Set<string>();
    let hadLegacySample = false;
    const quotes = data.filter((item): item is Quote => {
      if (typeof item !== "object" || item === null) return false;
      const q = item as Record<string, unknown>;
      if (!(typeof q.id === "string" && typeof q.author === "string" && typeof q.quote === "string" && isState(q.state))) return false;
      if (isLegacySample(q)) { hadLegacySample = true; return false; }
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
    // Only the old sample was stored: start like a new visitor, with the labelled sample.
    return hadLegacySample && quotes.length === 0 ? null : quotes;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Static, escaped HTML for the Featured quotes, in their current order, so the
 * curated set can be pasted into another site. Returns "" when none are featured.
 */
export function featuredEmbedHtml(quotes: Quote[]): string {
  const featured = quotes.filter((quote) => quote.state === "Featured");
  if (featured.length === 0) return "";
  const figures = featured.map(
    (quote) => `  <figure class="testimonial">\n    <blockquote><p>${escapeHtml(quote.quote)}</p></blockquote>\n    <figcaption>${escapeHtml(quote.author)}</figcaption>\n  </figure>`,
  );
  return `<section class="testimonials">\n${figures.join("\n")}\n</section>\n`;
}
