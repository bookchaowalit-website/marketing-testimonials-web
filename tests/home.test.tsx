import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the seed proof, its embed and the local-only notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Good work");
    expect(html).toContain("Shipped faster than expected.");
    expect(html).toContain("Alex");
    expect(html).toContain("Embed the featured quotes");
    expect(html).toContain("They are not published to a live site.");
    expect(html).toContain("NO FABRICATED RESULTS · LOCAL BROWSER STATE");
  });
});
