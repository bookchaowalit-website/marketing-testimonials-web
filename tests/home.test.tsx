import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page on the App shell", () => {
  const html = renderToString(<Home />);

  it("shows only a clearly labelled sample, never a made-up testimonial", () => {
    expect(html).toContain('class="as"');
    expect(html).toContain("Sample client");
    expect(html).toContain("Example only · not a real testimonial");
    expect(html).toMatch(/data-tone="amber"[^>]*>Review</);
    expect(html).not.toContain("Shipped faster than expected");
    expect(html).toContain("No quote is Featured yet");
  });

  it("keeps the local-demo notice near the top, one filled button, and the hub footer", () => {
    expect(html.indexOf("Local demo · saved in this browser only")).toBeLessThan(html.indexOf("Sample client"));
    expect(html.match(/class="as-button"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true"[^>]*><span>All quotes<\/span><span class="as-count">1<\/span>/);
    expect(html).toContain('href="https://bookchaowalit.com/"');
  });
});
