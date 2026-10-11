// T-09: static lyric reader, tested by rendering the synthetic fixtures through the real song page in the PREVIEW
// build (KLA_SITE_MODE=preview, :4323). The PRODUCTION build (:4321) must contain none of them.
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { parseDocument } from "yaml";
import { MOBILE_WIDTHS, PREVIEW_URL } from "../../playwright.config";
import { songSchema, type Song } from "../../src/lib/content/schemas";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SONGS_DIR = join(ROOT, "src", "content", "songs");
const fixtures: Song[] = readdirSync(SONGS_DIR)
  .filter((f) => f.endsWith(".yaml"))
  .sort()
  .map((f) => {
    const doc = parseDocument(readFileSync(join(SONGS_DIR, f), "utf8"), { customTags: ["timestamp"], merge: true, schema: "core" });
    return songSchema.parse(doc.toJS());
  });

const url = (slug: string) => `${PREVIEW_URL}/songs/${slug}/`;
const codePoints = (s: string) => [...s].map((c) => c.codePointAt(0));

async function open(page: Page, slug: string) {
  await page.goto(url(slug));
  await page.evaluate(() => document.fonts.ready);
}

/** Visible on screen (not merely present): the visually-hidden technique leaves a 1x1 px box. */
async function isShown(page: Page, selector: string): Promise<boolean[]> {
  return page.$$eval(selector, (els) => els.map((el) => el.getBoundingClientRect().height > 2));
}

for (const song of fixtures) {
  test.describe(song.slug, () => {
    test("every line: lang/dir correct, text in logical order, layers attached directly beneath it", async ({ page }) => {
      await open(page, song.slug);
      for (const line of song.stanzas.flatMap((s) => s.lines)) {
        const item = page.locator(`li[data-line="${line.id}"]`);
        const children = await item.evaluate((li) =>
          [...li.children].map((c) => ({
            layer: c.getAttribute("data-layer"),
            lang: c.getAttribute("lang"),
            dir: c.getAttribute("dir"),
            text: c.textContent,
          })),
        );
        const expected: { layer: string; lang: string; dir: string; text: string }[] = [
          { layer: "original", lang: line.lang, dir: "rtl", text: line.text },
        ];
        if (line.renderings.roman_popular !== undefined) {
          expected.push({ layer: "roman", lang: "khw-Latn", dir: "ltr", text: line.renderings.roman_popular });
        }
        if (line.renderings.en !== undefined) expected.push({ layer: "en", lang: "en", dir: "ltr", text: line.renderings.en });
        expect(children, line.id).toEqual(expected);
        // Exact logical order of code points, as stored (no reversal, no normalization).
        expect(codePoints(children[0]?.text ?? ""), line.id).toEqual(codePoints(line.text));
      }
    });

    test("default view is Khowar + Roman; English is hidden visually but stays in the accessibility tree", async ({ page }) => {
      await open(page, song.slug);
      await expect(page.locator("#show-roman")).toBeChecked();
      await expect(page.locator("#show-en")).not.toBeChecked();
      expect((await isShown(page, "[data-layer=original]")).every(Boolean)).toBe(true);
      expect((await isShown(page, "[data-layer=roman]")).every(Boolean)).toBe(true);
      expect((await isShown(page, "[data-layer=en]")).some(Boolean)).toBe(false);
      const english = await page.$$eval("[data-layer=en]", (els) =>
        els.map((el) => ({ display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility })),
      );
      for (const s of english) expect(s).toEqual({ display: "block", visibility: "visible" });
    });

    test("no horizontal scroll at 360, 390 and 430 px, with every layer shown", async ({ page }) => {
      for (const width of MOBILE_WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await open(page, song.slug);
        await page.locator("#show-en").check();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${width}px`).toBeLessThanOrEqual(0);
        if (process.env["UPDATE_SCREENSHOTS"] === "1" && song.slug === "test-fixture-03") {
          const dir = join(ROOT, "docs", "design-system", "screenshots");
          mkdirSync(dir, { recursive: true });
          await page.locator("#show-en").uncheck();
          await page.screenshot({ path: join(dir, `song-page-${width}.png`), fullPage: false });
        }
      }
    });

    test("ships no JavaScript and no hydration", async ({ page }) => {
      const scripts: string[] = [];
      page.on("request", (r) => {
        if (r.resourceType() === "script") scripts.push(r.url());
      });
      await open(page, song.slug);
      await expect(page.locator("script")).toHaveCount(0);
      await expect(page.locator("astro-island")).toHaveCount(0);
      await expect(page.locator('link[rel="modulepreload"]')).toHaveCount(0);
      expect(scripts).toEqual([]);
    });

    test("is noindex and labelled synthetic", async ({ page }) => {
      await open(page, song.slug);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator(".synthetic-notice")).toContainText("Synthetic test fixture");
    });

    test("has no serious or critical axe violations (default and all layers)", async ({ page }) => {
      await open(page, song.slug);
      for (const state of ["default", "all layers"]) {
        if (state === "all layers") await page.locator("#show-en").check();
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(blocking, `${state}: ${JSON.stringify(blocking.map((v) => [v.id, v.nodes.length]))}`).toEqual([]);
      }
    });
  });
}

test("CSS-only layer toggles work with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(url("test-fixture-01"));
  expect((await isShown(page, "[data-layer=en]")).some(Boolean)).toBe(false);
  await page.getByLabel("English").check();
  expect((await isShown(page, "[data-layer=en]")).every(Boolean)).toBe(true);
  await page.getByLabel("Roman Khowar").uncheck();
  expect((await isShown(page, "[data-layer=roman]")).some(Boolean)).toBe(false);
  expect((await isShown(page, "[data-layer=original]")).every(Boolean)).toBe(true);
  await context.close();
});

test("without :has() support every layer is shown and the controls are hidden", async ({ page }) => {
  await page.goto(url("test-fixture-01"));
  // Chromium supports :has(), so emulate a browser without it: drop the @supports blocks exactly as such a browser
  // would (the :has() block never applies; the "not :has()" block always applies).
  const removed = await page.evaluate(() => {
    let count = 0;
    for (const sheet of [...document.styleSheets]) {
      const rules = [...sheet.cssRules];
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (!(rule instanceof CSSSupportsRule)) continue;
        if (rule.conditionText.startsWith("not")) {
          const inner = [...rule.cssRules].map((r) => r.cssText).join("\n");
          sheet.deleteRule(i);
          sheet.insertRule(`@media all { ${inner} }`, i);
        } else if (rule.conditionText.includes(":has")) {
          sheet.deleteRule(i);
        }
        count++;
      }
    }
    return count;
  });
  expect(removed).toBeGreaterThanOrEqual(2);
  // Even with English unchecked, nothing is hidden.
  expect((await isShown(page, "[data-layer=en]")).every(Boolean)).toBe(true);
  expect((await isShown(page, "[data-layer=roman]")).every(Boolean)).toBe(true);
  await expect(page.locator(".layer-controls")).toBeHidden();
});

test("Latin names and numbers inside RTL lines are isolated with <bdi dir=ltr>", async ({ page }) => {
  await page.goto(url("test-fixture-01"));
  const bdi = page.locator('li[data-line="s3-l3"] [data-layer=original] bdi');
  await expect(bdi).toHaveText(["Alpha 7"]);
  await expect(bdi).toHaveAttribute("dir", "ltr");
  await page.goto(url("test-fixture-03"));
  await expect(page.locator('li[data-line="s1-l3"] [data-layer=original] bdi')).toHaveText(["Test-Name"]);
});

test("a stanza without English renders no English elements and no empty placeholders", async ({ page }) => {
  await page.goto(url("test-fixture-02"));
  const stanza = page.locator('[data-stanza="3"]');
  await expect(stanza.locator("[data-layer=en]")).toHaveCount(0);
  await expect(stanza.locator("[data-layer=roman]")).toHaveCount(2);
  const empty = await page.$$eval(".lyrics p, .lyrics li", (els) => els.filter((e) => (e.textContent ?? "").trim() === "").length);
  expect(empty).toBe(0);
  // English still offered because other stanzas have it.
  await expect(page.locator("#show-en")).toHaveCount(1);
});

test("Khowar and Roman text are protected from browser auto-translation; English may be translated", async ({ page }) => {
  await page.goto(url("test-fixture-01"));
  for (const selector of ["[data-layer=original]", "[data-layer=roman]", "h1"]) {
    const values = await page.$$eval(selector, (els) => els.map((e) => e.getAttribute("translate")));
    expect(values.every((v) => v === "no"), selector).toBe(true);
  }
  expect(await page.$$eval("[data-layer=en]", (els) => els.every((e) => e.getAttribute("translate") === null))).toBe(true);
});

test("the Urdu line keeps its logical character order in the page", async ({ page }) => {
  await page.goto(url("test-fixture-02"));
  const text = await page.locator('li[data-line="s2-l3"] [data-layer=original]').textContent();
  // ی ہ space ا ی ک ... : first letter is yeh (U+06CC), not the last letter of the sentence.
  expect(codePoints(text ?? "").slice(0, 4)).toEqual([0x06cc, 0x06c1, 0x20, 0x0627]);
  expect(text).toBe("یہ ایک آزمائشی سطر ہے");
});

test.describe("production build", () => {
  test("has no synthetic song pages", async ({ request }) => {
    for (const song of fixtures) {
      const res = await request.get(`/songs/${song.slug}/`);
      expect(res.status(), song.slug).toBe(404);
    }
  });
});
