// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector(selector) as T | null;
const button = (text: string, scope: ParentNode = host) => [...scope.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith(text)) as HTMLButtonElement;
const rows = () => [...host.querySelectorAll(".as-row h3")].map((h) => h.textContent);
const press = (el: Element, detail = 1) => act(() => { el.dispatchEvent(new MouseEvent("click", { bubbles: true, detail })); });
function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function pick(el: HTMLSelectElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function addQuote(author: string, quote: string, state?: string) {
  press(button("New quote"));
  type($<HTMLInputElement>(".as-composer input")!, author);
  type($<HTMLTextAreaElement>(".as-composer textarea")!, quote);
  if (state) press(button(state, $(".as-composer")!));
  act(() => { $<HTMLFormElement>(".as-composer")!.requestSubmit(); });
}

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Home />));
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});

describe("composer and embed", () => {
  it("adds a Featured quote, which appears in the embed and copies", async () => {
    press(button("New quote"));
    expect(document.activeElement).toBe($(".as-composer input"));
    expect(button("Add", $(".as-composer")!).disabled).toBe(true);
    press(button("Cancel"));
    addQuote("Dana, Studio K", "Clear plan, on time.", "Featured");
    expect(rows()[0]).toBe("Dana, Studio K");
    expect(document.activeElement?.textContent).toContain("New quote");
    const embed = $<HTMLTextAreaElement>(".tm-embed textarea")!.value;
    expect(embed).toContain("<figcaption>Dana, Studio K</figcaption>");
    expect(embed).not.toContain("Sample client");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await act(async () => { button("Copy embed HTML").click(); });
    expect(writeText).toHaveBeenCalledWith(embed);
    expect($(".tm-embed-actions")!.textContent).toContain("Copied");
    writeText.mockRejectedValueOnce(new Error("blocked"));
    await act(async () => { button("Copy embed HTML").click(); });
    expect($(".tm-embed-actions")!.textContent).toContain("Copy is blocked");
  });

  it("a whitespace-only quote is refused with a message", () => {
    addQuote("Dana", "   ");
    expect($('[role="status"].as-sr')!.textContent).toContain("Add both an author and a quote");
  });
});

describe("lists, search, state and remove", () => {
  it("changes state, moves the quote between lists, and shows per-list empty states", () => {
    pick($<HTMLSelectElement>(".tm-state select")!, "Archive");
    expect($(".as-row .as-pill")!.textContent).toBe("Archive");
    press(button("Archive", $(".as-side")!));
    expect(rows()).toEqual(["Sample client"]);
    press(button("Featured", $(".as-side")!));
    expect($(".as-empty")!.textContent).toContain("No Featured quotes");
  });

  it("search has its own empty state with Clear search", () => {
    type($<HTMLInputElement>(".as-search input")!, "zzz");
    expect($(".as-empty")!.textContent).toContain("Nothing matches");
    press(button("Clear search"));
    expect(rows()).toEqual(["Sample client"]);
  });

  it("Remove offers Undo; the toast closes on its own and on Escape", () => {
    vi.useFakeTimers();
    press(button("Remove"), 0);
    expect($(".as-empty")!.textContent).toContain("No quotes yet");
    expect(document.activeElement?.textContent).toBe("Undo");
    press(button("Undo"));
    expect(rows()).toEqual(["Sample client"]);
    press(button("Remove"));
    act(() => { vi.advanceTimersByTime(6100); });
    expect($(".as-toast")).toBeNull();
  });

  it("Escape closes the toast", () => {
    press(button("Remove"), 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect($(".as-toast")).toBeNull();
  });

  it("consecutive removes restore together with one Undo, each in its place", () => {
    addQuote("Ann", "First real words.");
    addQuote("Ben", "Second real words.");
    const before = rows();
    expect(before).toEqual(["Ben", "Ann", "Sample client"]);
    vi.useFakeTimers();
    press($('[aria-label="Remove the quote from Ann"]')!);
    act(() => { vi.advanceTimersByTime(4000); });
    press($('[aria-label="Remove the quote from Ben"]')!);
    expect(rows()).toEqual(["Sample client"]);
    expect($(".as-toast span")?.textContent).toBe("Removed 2 quotes");
    expect(button("Undo").getAttribute("aria-label")).toBe("Undo remove of 2 quotes");
    // The second removal restarted the 6 s window.
    act(() => { vi.advanceTimersByTime(4000); });
    press(button("Undo"));
    expect(rows()).toEqual(before);
    expect($('[role="status"]')?.textContent).toBe("Restored 2 quotes.");
    expect($(".as-toast")).toBeNull();
  });

  it("keyboard remove focuses Undo; Undo focuses the restored quote, Escape the next one", () => {
    addQuote("Ann", "First real words.");
    press($('[aria-label="Remove the quote from Ann"]')!, 0);
    expect(document.activeElement).toBe(button("Undo"));
    press(button("Undo"), 0);
    expect(document.activeElement).toBe($('[aria-label="Remove the quote from Ann"]'));
    press($('[aria-label="Remove the quote from Ann"]')!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe($('[aria-label="Remove the quote from Sample client"]'));
    // Nothing left to land on: New quote.
    press($('[aria-label="Remove the quote from Sample client"]')!, 0);
    act(() => { $(".as-toast")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.activeElement).toBe(button("New quote"));
  });
});

describe("2026-11-19 review", () => {
  function remount(stored: unknown) {
    act(() => root.unmount());
    localStorage.setItem("testimonials-v2", JSON.stringify(stored));
    root = createRoot(host);
    act(() => root.render(<Home />));
  }
  const alex = { id: "alex", author: "Alex", quote: "Shipped faster than expected.", state: "Featured" };

  it("drops the old Alex sample from an upgraded browser but keeps every quote the user added", () => {
    remount([{ id: "q1", author: "Dana", quote: "Real words.", state: "Featured" }, alex]);
    expect(rows()).toEqual(["Dana"]);
    expect($<HTMLTextAreaElement>(".tm-embed textarea")!.value).not.toContain("Alex");
  });

  it("an upgraded browser holding only the old sample gets the labelled sample instead", () => {
    remount([alex]);
    expect(rows()).toEqual(["Sample client"]);
    expect($(".tm-embed textarea")).toBeNull();
  });

  it("Undo puts a quote back next to its old neighbours, after quotes added meanwhile", () => {
    addQuote("Ann", "First real words.");
    addQuote("Ben", "Second real words.");
    expect(rows()).toEqual(["Ben", "Ann", "Sample client"]);
    press($('[aria-label="Remove the quote from Ben"]')!);
    addQuote("Cy", "Third real words.");
    press(button("Undo"));
    expect(rows()).toEqual(["Cy", "Ben", "Ann", "Sample client"]);
  });

  it("a state change that takes the row out of the open list moves focus to the next row, then to the list", () => {
    addQuote("Ann", "First real words.", "Featured");
    addQuote("Ben", "Second real words.", "Featured");
    press([...host.querySelectorAll<HTMLButtonElement>(".as-lists button")].find((b) => b.textContent?.startsWith("Featured"))!);
    expect(rows()).toEqual(["Ben", "Ann"]);
    const ben = $<HTMLSelectElement>('[aria-label="State for the quote from Ben"]')!;
    act(() => ben.focus());
    pick(ben, "Review");
    expect(rows()).toEqual(["Ann"]);
    const ann = $<HTMLSelectElement>('[aria-label="State for the quote from Ann"]')!;
    expect(document.activeElement).toBe(ann);
    pick(ann, "Archive");
    expect(rows()).toEqual([]);
    expect(document.activeElement).toBe($('.as-lists button[aria-current="true"]'));
  });
});
