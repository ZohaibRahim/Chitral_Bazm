// T-07: automated checks of the font test page in Chromium, plus screenshots for review.
// Records which font Chromium actually used for every specimen (CDP CSS.getPlatformFontsForNode), so a browser
// fallback font can never be mistaken for the font under test. This proves Chromium rendering only; other browsers
// and the correctness of Khowar letterforms need manual review on devices (P1-1).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { MOBILE_WIDTHS } from "../../playwright.config";

const FONTS_DIR = fileURLToPath(new URL("./", import.meta.url));
const RESULTS_DATE = readdirSync(join(FONTS_DIR, "results"))
  .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  .sort()
  .at(-1);
const RESULTS = join(FONTS_DIR, "results", RESULTS_DATE ?? "undated");

type Built = { id: string; family: string; file: string };
type ReportFont = { id: string; family: string; required_missing: string[] };
const built = JSON.parse(readFileSync(join(FONTS_DIR, "build", "fonts-built.json"), "utf8")) as Built[];
const report = JSON.parse(readFileSync(join(RESULTS, "font-report.json"), "utf8")) as { fonts: ReportFont[] };
const missingByFont = new Map(report.fonts.map((f) => [f.id, new Set(f.required_missing.map((m) => m.split(" ")[0]))]));

async function openPage(page: Page) {
  await page.goto("/font-test.html");
  await page.evaluate(() => document.fonts.ready);
}

test("is a noindex development page that loads nothing from outside", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://localhost:4322/")) external.push(r.url());
  });
  await openPage(page);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  expect(external).toEqual([]);
});

test("every candidate font file loads", async ({ page }) => {
  await openPage(page);
  const faces = await page.evaluate(async () => {
    const all = [...document.fonts];
    await Promise.all(all.map((f) => f.load().catch(() => undefined)));
    return all.map((f) => ({ family: f.family.replaceAll('"', ""), status: f.status }));
  });
  expect(faces.map((f) => f.family).sort()).toEqual(built.map((f) => `KLA ${f.family}`).sort());
  for (const face of faces) expect(face.status, face.family).toBe("loaded");
});

test("Chromium renders each specimen with the font under test, except characters the font lacks", async ({ page }) => {
  await openPage(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument", { depth: -1 });
  const { nodeIds } = await cdp.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-kind][data-font]" });

  const rows: { font: string; kind: string; cp: string | null; form: string | null; rendered_with: string[] }[] = [];
  for (const nodeId of nodeIds) {
    const { attributes } = await cdp.send("DOM.getAttributes", { nodeId });
    const attr = (n: string) => {
      const i = attributes.indexOf(n);
      return i >= 0 ? (attributes[i + 1] ?? null) : null;
    };
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    rows.push({
      font: attr("data-font") ?? "",
      kind: attr("data-kind") ?? "",
      cp: attr("data-cp"),
      form: attr("data-form"),
      rendered_with: fonts.filter((f) => f.glyphCount > 0).map((f) => `${f.familyName}${f.isCustomFont ? "" : " (system)"}`),
    });
  }
  mkdirSync(RESULTS, { recursive: true });
  writeFileSync(
    join(RESULTS, "browser-chromium.json"),
    `${JSON.stringify({ browser: `Chromium ${page.context().browser()?.version()}`, specimens: rows }, null, 2)}\n`,
  );

  const familyOf = new Map(built.map((f) => [f.id, f.family]));
  for (const row of rows.filter((r) => r.kind === "matrix")) {
    const expected = familyOf.get(row.font) ?? "";
    const lacks = row.cp !== null && (missingByFont.get(row.font)?.has(row.cp) ?? false);
    if (lacks) {
      // The font does not have this letter: Chromium must have used some other font. Recorded, not hidden.
      expect(row.rendered_with.some((f) => !f.startsWith(expected)), `${row.font} ${row.cp} ${row.form}`).toBe(true);
    } else {
      expect(row.rendered_with, `${row.font} ${row.cp} ${row.form}`).toEqual([expected]);
    }
  }
});

for (const width of MOBILE_WIDTHS) {
  test(`no horizontal scroll and a screenshot at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    mkdirSync(RESULTS, { recursive: true });
    await page.screenshot({ path: join(RESULTS, `chromium-${width}.jpg`), fullPage: true, type: "jpeg", quality: 70 });
  });
}

test("is readable with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:4322/font-test.html");
  await expect(page.locator('[data-kind="matrix"]').first()).toBeVisible();
  await context.close();
});
