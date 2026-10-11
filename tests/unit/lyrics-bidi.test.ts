// T-09: direction runs for <bdi> isolation, and logical-order regression for the Urdu and Khowar fixture text.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import { songSchema } from "../../src/lib/content/schemas";
import { directionalRuns } from "../../src/lib/lyrics/bidi";

const fixture = (slug: string) =>
  songSchema.parse(
    parseDocument(readFileSync(new URL(`../../src/content/songs/${slug}.yaml`, import.meta.url), "utf8"), {
      customTags: ["timestamp"],
      merge: true,
      schema: "core",
    }).toJS(),
  );
const cps = (s: string) => [...s].map((c) => `U+${c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`);

describe("directionalRuns", () => {
  it("isolates a Latin name and number as one LTR run", () => {
    expect(directionalRuns("ݰان Alpha 7 بݰا")).toEqual([
      { text: "ݰان ", ltr: false },
      { text: "Alpha 7", ltr: true },
      { text: " بݰا", ltr: false },
    ]);
  });

  it("keeps hyphenated names together and leaves Urdu digits in the RTL run", () => {
    expect(directionalRuns("ݰان ۲۰۲۶ Test-Name بݮا").filter((r) => r.ltr)).toEqual([{ text: "Test-Name", ltr: true }]);
  });

  it("returns pure RTL text unchanged as a single run", () => {
    expect(directionalRuns("یہ ایک آزمائشی سطر ہے")).toEqual([{ text: "یہ ایک آزمائشی سطر ہے", ltr: false }]);
  });

  it("never changes the text: runs join back to the input exactly", () => {
    for (const text of ["ݰان Alpha 7 بݰا", "ݰان ۲۰۲۶ Test-Name بݮا", "a", "", "  بݮ  B  "]) {
      expect(directionalRuns(text).map((r) => r.text).join("")).toBe(text);
    }
  });
});

describe("logical-order regression (fixtures must stay in typing order, never visually reversed)", () => {
  it("the Urdu line is stored in logical order", () => {
    const line = fixture("test-fixture-02").stanzas[1]?.lines.find((l) => l.lang === "ur");
    // "yeh aik aazmaishi satar hai": starts with yeh + heh goal, ends with barree yeh.
    expect(cps(line?.text ?? "")).toEqual(cps("یہ ایک آزمائشی سطر ہے"));
    expect(cps(line?.text ?? "").slice(0, 2)).toEqual(["U+06CC", "U+06C1"]);
    expect(cps(line?.text ?? "").at(-1)).toBe("U+06D2");
  });

  it("a Khowar position line starts with the isolated letter, as written", () => {
    const line = fixture("test-fixture-01").stanzas[0]?.lines[0];
    expect(cps(line?.text ?? "").slice(0, 2)).toEqual(["U+076E", "U+0020"]);
  });

  it("no fixture text contains bidi control characters that could mask reversed storage", () => {
    for (const slug of ["test-fixture-01", "test-fixture-02", "test-fixture-03"]) {
      const text = fixture(slug).stanzas.flatMap((s) => s.lines.map((l) => l.text)).join("");
      expect(text, slug).not.toMatch(/[‎‏‪-‮⁦-⁩]/u);
    }
  });
});
