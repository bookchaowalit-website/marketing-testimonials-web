"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppFoot, AppTop, ListButton, Pill, PlusIcon, type Tone } from "@/components/app-shell";
import { createQuote, featuredEmbedHtml, MAX_AUTHOR, MAX_QUOTE, parseQuotes, STATES, visibleQuotes, type Quote, type State } from "@/lib/testimonials";
import { useStoredState } from "@/lib/use-stored-state";

type ListFilter = "All" | State;
// index: where it sat in the stored list when removed; before / after: the ids stored either side of it then, so Undo
// puts it back between the same quotes even after new ones were added. nextShown / prevShown: the rows shown around it, for focus.
type RemovedEntry = { quote: Quote; index: number; before?: string; after?: string; nextShown?: string; prevShown?: string };
type RemovedBatch = { items: RemovedEntry[]; viaKeyboard: boolean };
const removedLabel = (items: RemovedEntry[]) => (items.length === 1 ? `Removed the quote from ${items[0].quote.author}` : `Removed ${items.length} quotes`);
type Draft = { author: string; quote: string; state: State };

// A sample, not a testimonial: nobody said this. It starts in Review so it never reaches the embed by itself.
const SAMPLE_ID = "sample";
const SEED: Quote[] = [{ id: SAMPLE_ID, author: "Sample client", quote: "Replace this sample with words a real client said and agreed to share.", state: "Review" }];
const EMPTY: Draft = { author: "", quote: "", state: "Review" };
const TONE: Record<State, Tone> = { Featured: "green", Review: "amber", Archive: "grey" };
const LISTS: ListFilter[] = ["All", ...STATES];

// randomUUID only exists in secure contexts (HTTPS/localhost) and newer browsers.
function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `quote-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const plural = (count: number) => `${count} ${count === 1 ? "quote" : "quotes"}`;

export default function Home() {
  const [quotes, setQuotes] = useStoredState("testimonials-v2", SEED, parseQuotes);
  const [list, setList] = useState<ListFilter>("All");
  const [query, setQuery] = useState("");
  const [composing, setComposing] = useState(false);
  const [draft, setDraftState] = useState<Draft>(EMPTY);
  // A quote createQuote refused (e.g. only quote marks or zero-width characters): shown in the form until the next edit.
  const [formError, setFormError] = useState("");
  const setDraft = (next: Draft) => { setDraftState(next); setFormError(""); };
  // Every removal still inside the Undo window: one Undo puts them all back where they were.
  const [removed, setRemovedState] = useState<RemovedBatch | null>(null);
  // The latest batch, so two removals before a re-render still both land in it.
  const removedRef = useRef<RemovedBatch | null>(null);
  const setRemoved = (batch: RemovedBatch | null) => { removedRef.current = batch; setRemovedState(batch); };
  const [toastFocused, setToastFocused] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [embedNotice, setEmbedNotice] = useState("");
  const authorRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const focusRowsNext = useRef<string[] | null>(null);
  // A state change that takes its row out of the open list: focus the state control of the first of these rows still shown, else the list.
  const focusStateNext = useRef<string[] | null>(null);
  const wasComposing = useRef(false);
  const inList = useMemo(() => (list === "All" ? quotes : quotes.filter((item) => item.state === list)), [quotes, list]);
  const visible = useMemo(() => visibleQuotes(inList, query), [inList, query]);
  // The sample is not a testimonial: it never goes into the copied HTML, whatever its state.
  const embed = useMemo(() => featuredEmbedHtml(quotes.filter((item) => item.id !== SAMPLE_ID)), [quotes]);
  const countOf = (value: ListFilter) => (value === "All" ? quotes.length : quotes.filter((item) => item.state === value).length);

  // Opening the composer focuses its first field; closing it returns focus to New quote.
  useEffect(() => {
    if (composing) authorRef.current?.focus();
    else if (wasComposing.current) newRef.current?.focus();
    wasComposing.current = composing;
  }, [composing]);
  // A removal made from the keyboard moves focus to Undo (the focused Remove button has just gone).
  useEffect(() => { if (removed?.viaKeyboard) undoRef.current?.focus(); }, [removed]);
  // When the toast closes after Undo or Escape, focus goes back near the removed row once the list has re-rendered:
  // the first of these rows still shown, else New quote (or the composer's first field when it is open).
  useEffect(() => {
    const ids = focusRowsNext.current;
    if (removed || !ids) return;
    focusRowsNext.current = null;
    const shown = [...document.querySelectorAll<HTMLElement>(".as-row[data-quote]")];
    const row = ids.map((id) => shown.find((entry) => entry.dataset.quote === id)).find(Boolean);
    (row?.querySelector<HTMLButtonElement>(".as-danger") ?? newRef.current ?? authorRef.current)?.focus();
  }, [removed, quotes]);
  useEffect(() => {
    const ids = focusStateNext.current;
    if (!ids) return;
    focusStateNext.current = null;
    const shown = [...document.querySelectorAll<HTMLElement>(".as-row[data-quote]")];
    const row = ids.map((id) => shown.find((entry) => entry.dataset.quote === id)).find(Boolean);
    (row?.querySelector<HTMLSelectElement>(".tm-state select") ?? document.querySelector<HTMLButtonElement>('.as-lists button[aria-current="true"]'))?.focus();
  }, [quotes]);
  // The Undo toast closes 6 s after the latest removal (each removal restarts it), but never while it holds focus.
  useEffect(() => {
    if (!removed || toastFocused) return;
    const timer = window.setTimeout(() => { removedRef.current = null; setRemovedState(null); }, 6000);
    return () => window.clearTimeout(timer);
  }, [removed, toastFocused]);
  // While the toast shows, the page reserves its height so nothing focusable stays hidden under it.
  const toastShown = removed !== null;
  useLayoutEffect(() => {
    const toast = toastRef.current;
    if (!toastShown || !toast) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--as-toast-space", `${toast.offsetHeight + 32}px`);
    return () => { rootStyle.removeProperty("--as-toast-space"); };
  }, [toastShown]);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = createQuote(draft.author, draft.quote, draft.state, createId());
    if ("error" in next) { setFormError(next.error); setAnnouncement(next.error); return; }
    setQuotes((current) => [next, ...current]);
    if (list !== "All" && list !== next.state) setList(next.state);
    setQuery("");
    setAnnouncement(`Added the quote from ${next.author} as ${next.state}.`);
    setDraft(EMPTY);
    setComposing(false);
  }

  function restate(item: Quote, state: State) {
    if (list !== "All" && state !== list) {
      const shownAt = visible.findIndex((entry) => entry.id === item.id);
      focusStateNext.current = [visible[shownAt + 1]?.id, shownAt > 0 ? visible[shownAt - 1].id : undefined].filter((id): id is string => Boolean(id));
    }
    setQuotes((current) => current.map((entry) => (entry.id === item.id ? { ...entry, state } : entry)));
    setAnnouncement(`The quote from ${item.author} is now ${state}.`);
  }

  function remove(item: Quote, viaKeyboard: boolean) {
    const index = quotes.findIndex((entry) => entry.id === item.id);
    if (index < 0) return;
    setQuotes((current) => current.filter((entry) => entry.id !== item.id));
    const shownAt = visible.findIndex((entry) => entry.id === item.id);
    const entry: RemovedEntry = { quote: item, index, before: quotes[index - 1]?.id, after: quotes[index + 1]?.id, nextShown: visible[shownAt + 1]?.id, prevShown: shownAt > 0 ? visible[shownAt - 1].id : undefined };
    const items = [...(removedRef.current?.items ?? []), entry];
    setRemoved({ items, viaKeyboard });
    setAnnouncement(`${removedLabel(items)}. Undo is available for a few seconds.`);
  }

  function closeToast(focusIds?: string[]) {
    const last = removedRef.current?.items.at(-1);
    // Dismissed: the row after the removed one, else the one before it.
    focusRowsNext.current = focusIds ?? [last?.nextShown, last?.prevShown].filter((id): id is string => Boolean(id));
    setRemoved(null);
    setToastFocused(false);
  }

  function undo() {
    const items = removedRef.current?.items;
    if (!items?.length) return;
    // Latest removal first, so each neighbour refers to the list as it was just before that removal. Back after the
    // quote it followed, else before the one it preceded, else at its old index (quotes added meanwhile keep their place).
    setQuotes((current) => items.reduceRight((list, { quote, index, before, after }) => {
      if (list.some((entry) => entry.id === quote.id)) return list;
      const prev = before ? list.findIndex((entry) => entry.id === before) : -1;
      const next = after ? list.findIndex((entry) => entry.id === after) : -1;
      const at = prev >= 0 ? prev + 1 : next >= 0 ? next : Math.min(index, list.length);
      return [...list.slice(0, at), quote, ...list.slice(at)];
    }, current));
    setAnnouncement(items.length === 1 ? `Restored the quote from ${items[0].quote.author}.` : `Restored ${items.length} quotes.`);
    // Undone: back to the restored row (the latest one, where the user was last).
    closeToast([items[items.length - 1].quote.id]);
  }

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(embed);
      setEmbedNotice("Copied");
    } catch {
      setEmbedNotice("Copy is blocked here: select the HTML instead");
    }
  }

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  const title = list === "All" ? "All quotes" : list;
  const q = query.trim();

  return (
    <div className="as">
      <a className="as-skip" href="#main">Skip to content</a>
      <AppTop name="Testimonials" tagline="Collect quotes, feature the best" />

      <div className="as-body">
        <aside className="as-side" aria-label="Lists">
          <h2>Lists</h2>
          <ul className="as-lists">
            {LISTS.map((value) => (
              <ListButton key={value} label={value === "All" ? "All quotes" : value} count={countOf(value)} tone={value === "All" ? undefined : TONE[value]} current={list === value} onSelect={() => setList(value)} />
            ))}
          </ul>
        </aside>

        <main id="main" className="as-main">
          <div className="as-head">
            <div>
              <h1>{title}</h1>
              <p aria-live="polite">{plural(visible.length)}{q ? ` matching “${q}”` : ""}</p>
              <span className="tm-local"><Pill tone="grey">Local demo · saved in this browser only</Pill></span>
            </div>
            <div className="as-tools">
              <label className="as-search">
                <span className="as-sr">Search quotes</span>
                <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
              </label>
              {composing ? null : <button ref={newRef} type="button" className="as-button" onClick={() => setComposing(true)}><PlusIcon />New quote</button>}
            </div>
          </div>

          {composing ? (
            <form className="as-composer" onSubmit={add} aria-label="New quote">
              <label className="as-field">Author or company
                <input ref={authorRef} value={draft.author} maxLength={MAX_AUTHOR} onChange={(event) => setDraft({ ...draft, author: event.target.value })} autoComplete="off" />
              </label>
              <label className="as-field">What did they say?
                <textarea value={draft.quote} maxLength={MAX_QUOTE} aria-invalid={formError ? true : undefined} aria-describedby={formError ? "quote-error quote-hint" : "quote-hint"} onChange={(event) => setDraft({ ...draft, quote: event.target.value })} placeholder="A short, specific note in their words" />
                {formError ? <span id="quote-error" className="tm-error">{formError}</span> : null}
                <span id="quote-hint" className="tm-hint">Only add words a real client said and agreed to share.</span>
              </label>
              <div className="as-composer-foot">
                <div className="as-segmented-wrap">
                  <span id="state-label">State</span>
                  <div className="as-segmented" role="group" aria-labelledby="state-label">
                    {STATES.map((state) => (
                      <button key={state} type="button" aria-pressed={draft.state === state} onClick={() => setDraft({ ...draft, state })}>{state}</button>
                    ))}
                  </div>
                </div>
                <div className="as-composer-actions">
                  <button type="button" className="as-plain" onClick={() => { setComposing(false); setDraft(EMPTY); }}>Cancel</button>
                  <button type="submit" className="as-button" disabled={!draft.author.trim() || !draft.quote.trim()}>Add</button>
                </div>
              </div>
            </form>
          ) : null}

          {visible.length ? (
            <ul className="as-list" aria-label={title}>
              {visible.map((item) => (
                <li className="as-row" key={item.id} data-quote={item.id}>
                  <div>
                    <h3>{item.author}</h3>
                    <p className="tm-quote">“{item.quote}”</p>
                    {item.id === SAMPLE_ID ? <p className="as-row-meta">Example only · not a real testimonial</p> : null}
                    <label className="tm-state">State
                      <select value={item.state} onChange={(event) => restate(item, event.target.value as State)} aria-label={`State for the quote from ${item.author}`}>
                        {STATES.map((state) => <option key={state}>{state}</option>)}
                      </select>
                    </label>
                  </div>
                  <Pill tone={TONE[item.state]}>{item.state}</Pill>
                  <button type="button" className="as-plain as-danger" aria-label={`Remove the quote from ${item.author}`} onClick={(event) => remove(item, event.detail === 0)}>Remove</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="as-list as-empty">
              {q ? (
                <>
                  <strong>Nothing matches</strong>
                  No quote in {list === "All" ? "your lists" : title} mentions “{q}”.
                  <div style={{ marginTop: 8 }}><button type="button" className="as-plain" onClick={clearSearch}>Clear search</button></div>
                </>
              ) : quotes.length === 0 ? (
                <><strong>No quotes yet</strong>Press New quote and paste the words a client gave you permission to use.</>
              ) : (
                <><strong>No {title} quotes</strong>Change a quote&apos;s state, or press New quote and pick {title}.</>
              )}
            </div>
          )}

          <section className="as-section" aria-labelledby="embed-heading">
            <h2 id="embed-heading" className="as-section-title">Embed the featured quotes</h2>
            <div className="tm-embed">
              {embed ? (
                <>
                  <p>Static, escaped HTML of every Featured quote, ready to paste into another site and style with its CSS.</p>
                  <label><span className="as-sr">Embed HTML</span><textarea readOnly value={embed} spellCheck={false} /></label>
                  <div className="tm-embed-actions">
                    <button type="button" className="as-plain" style={{ paddingLeft: 0 }} onClick={() => void copyEmbed()}>Copy embed HTML</button>
                    <span role="status">{embedNotice}</span>
                  </div>
                </>
              ) : (
                <p>No quote is Featured yet. Set a real quote&apos;s state to Featured to include it here.</p>
              )}
            </div>
          </section>

          <p className="as-note">Quotes added here stay in this browser and are not published anywhere. The sample quote is not a real testimonial.</p>
        </main>
      </div>

      <p className="as-sr" role="status" aria-live="polite">{announcement}</p>
      {removed ? (
        <div
          ref={toastRef}
          className="as-toast"
          role="group"
          aria-label="Undo remove"
          onFocus={() => setToastFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setToastFocused(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") closeToast(); }}
        >
          <span>{removedLabel(removed.items)}</span>
          <button ref={undoRef} type="button" className="as-plain" onClick={undo} aria-label={removed.items.length === 1 ? undefined : `Undo remove of ${removed.items.length} quotes`}>Undo</button>
        </div>
      ) : null}

      <AppFoot source="https://github.com/bookchaowalit-website/marketing-testimonials-web" />
    </div>
  );
}
