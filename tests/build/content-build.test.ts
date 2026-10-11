// Negative and positive build tests: run the real `astro build` against temporary content (KLA_CONTENT_ROOT).
// Covers P1-5 (synthetic published fails the production build) and build-time credit reference validation.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FIXTURES = join(ROOT, "tests", "fixtures");
const TMP = join(ROOT, "tests", ".tmp", "build");
const ASTRO = join(ROOT, "node_modules", "astro", "bin", "astro.mjs");

const PEOPLE: Record<string, string> = {
  "singer-one": "slug: singer-one\ndisplay_name: Singer One\nis_living: true\n",
  "composer-one": "slug: composer-one\ndisplay_name: Composer One\n",
};

type Case = { songs: Record<string, string>; people?: Record<string, string>; env?: Record<string, string> };

function build(name: string, c: Case): { status: number | null; output: string; dist: string } {
  const dir = join(TMP, name);
  rmSync(dir, { recursive: true, force: true });
  for (const sub of ["songs", "people"]) mkdirSync(join(dir, "content", sub), { recursive: true });
  for (const [file, src] of Object.entries(c.songs)) copyFileSync(src, join(dir, "content", "songs", file));
  for (const [slug, yaml] of Object.entries(c.people ?? PEOPLE)) writeFileSync(join(dir, "content", "people", `${slug}.yaml`), yaml);

  const dist = join(dir, "dist");
  const result = spawnSync(process.execPath, [ASTRO, "build", "--force", "--outDir", dist], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, KLA_CONTENT_ROOT: join(dir, "content"), ASTRO_TELEMETRY_DISABLED: "1", ...c.env },
  });
  return { status: result.status, output: `${result.stdout}\n${result.stderr}`, dist };
}

/** Every emitted file, as paths relative to dist. */
const builtFiles = (dist: string): string[] =>
  readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name).slice(dist.length + 1));

afterAll(() => rmSync(TMP, { recursive: true, force: true }));

/** Minimal reader for Astro's content data store (devalue "flat" JSON), enough to list collections and entry data. */
function readDataStore(): Map<string, Map<string, { data: Record<string, unknown> }>> {
  const flat = JSON.parse(readFileSync(join(ROOT, "node_modules", ".astro", "data-store.json"), "utf8")) as unknown[];
  const seen = new Map<number, unknown>();
  const hydrate = (index: number): unknown => {
    if (index < 0) return undefined; // devalue sentinels: undefined, holes, NaN, infinities
    if (seen.has(index)) return seen.get(index);
    const value = flat[index];
    if (Array.isArray(value)) {
      if (value[0] === "Map") {
        const map = new Map();
        seen.set(index, map);
        for (let i = 1; i < value.length; i += 2) map.set(hydrate(value[i] as number), hydrate(value[i + 1] as number));
        return map;
      }
      if (value[0] === "Date") return new Date(value[1] as string);
      if (value[0] === "Set") return new Set(value.slice(1).map((i) => hydrate(i as number)));
      const arr: unknown[] = [];
      seen.set(index, arr);
      for (const i of value) arr.push(hydrate(i as number));
      return arr;
    }
    if (value !== null && typeof value === "object") {
      const obj: Record<string, unknown> = {};
      seen.set(index, obj);
      for (const [k, i] of Object.entries(value)) obj[k] = hydrate(i as number);
      return obj;
    }
    return value;
  };
  return hydrate(0) as Map<string, Map<string, { data: Record<string, unknown> }>>;
}

describe("preview mode (T-09 test-only fixture rendering)", () => {
  it("renders the three fixtures as noindex song pages only when KLA_SITE_MODE=preview", () => {
    const dist = join(TMP, "preview", "dist");
    rmSync(join(TMP, "preview"), { recursive: true, force: true });
    const env: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", KLA_SITE_MODE: "preview" };
    delete env["KLA_CONTENT_ROOT"];
    const r = spawnSync(process.execPath, [ASTRO, "build", "--force", "--outDir", dist], { cwd: ROOT, encoding: "utf8", env });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
    const pages = builtFiles(dist).filter((f) => f.split(/[\\/]/)[0] === "songs").sort();
    expect(pages.map((p) => p.replaceAll("\\", "/"))).toEqual([
      "songs/test-fixture-01/index.html",
      "songs/test-fixture-02/index.html",
      "songs/test-fixture-03/index.html",
    ]);
    for (const page of pages) {
      const html = readFileSync(join(dist, page), "utf8");
      expect(html, page).toMatch(/<meta name="robots" content="noindex, nofollow">/);
      expect(html, page).toContain("Synthetic test fixture");
      expect(html, page).not.toMatch(/<script/);
    }
  });

  it("a production build stays production whatever NODE_ENV says (regression: NODE_ENV once enabled dev mode)", () => {
    for (const nodeEnv of ["development", "test"]) {
      const dist = join(TMP, `node-env-${nodeEnv}`, "dist");
      const env: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", NODE_ENV: nodeEnv };
      delete env["KLA_SITE_MODE"];
      delete env["KLA_CONTENT_ROOT"];
      const r = spawnSync(process.execPath, [ASTRO, "build", "--force", "--outDir", dist], { cwd: ROOT, encoding: "utf8", env });
      expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);
      expect(builtFiles(dist).filter((f) => f.split(/[\\/]/)[0] === "songs"), nodeEnv).toEqual([]);
    }
  });

  it("refuses an unknown site mode instead of guessing", () => {
    const env: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", KLA_SITE_MODE: "staging" };
    const r = spawnSync(process.execPath, [ASTRO, "build", "--outDir", join(TMP, "bad-mode")], { cwd: ROOT, encoding: "utf8", env });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}\n${r.stderr}`).toMatch(/KLA_SITE_MODE must be "production" or "preview"/);
  });
});

describe("real content in src/content (T-05 synthetic fixtures)", () => {
  it("loads the three fixtures through the Astro collections and emits none of them in production", () => {
    const dist = join(TMP, "real-content", "dist");
    rmSync(join(TMP, "real-content"), { recursive: true, force: true });
    const env: NodeJS.ProcessEnv = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" };
    delete env["KLA_CONTENT_ROOT"];
    delete env["KLA_SITE_MODE"];
    const r = spawnSync(process.execPath, [ASTRO, "build", "--force", "--outDir", dist], { cwd: ROOT, encoding: "utf8", env });
    expect(r.status, `${r.stdout}\n${r.stderr}`).toBe(0);

    const store = readDataStore();
    const songs = store.get("songs");
    expect([...(songs?.keys() ?? [])].sort()).toEqual(["test-fixture-01", "test-fixture-02", "test-fixture-03"]);
    for (const entry of songs?.values() ?? []) {
      expect(entry.data["synthetic"]).toBe(true);
      expect(entry.data["status"]).toBe("draft");
    }
    expect([...(store.get("people")?.keys() ?? [])].sort()).toEqual(["test-person-a", "test-person-b", "test-person-c"]);

    expect(builtFiles(dist).filter((f) => f.split(/[\\/]/)[0] === "songs")).toEqual([]);

    // Nothing from the fixtures reaches the production output (pages, assets, any future search index or sitemap).
    const forbidden = [/test-fixture/, /Test Fixture/, /Test Person/, /[ݮݯݰݱځڅ]/u];
    for (const file of builtFiles(dist)) {
      expect(file).not.toMatch(/test-fixture/);
      if (!/\.(html|css|js|mjs|json|txt|xml|svg|webmanifest)$/.test(file)) continue; // text outputs only (not fonts)
      const content = readFileSync(join(dist, file), "utf8");
      for (const pattern of forbidden) expect(content, `${file} matches ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe("production build", () => {
  it("succeeds with a valid synthetic draft and emits nothing from it", () => {
    const r = build("valid-synthetic-draft", { songs: { "schema-valid.yaml": join(FIXTURES, "valid-songs", "schema-valid.yaml") } });
    expect(r.status, r.output).toBe(0);
    const files = builtFiles(r.dist);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file).not.toContain("schema-valid");
      expect(readFileSync(join(r.dist, file), "utf8"), file).not.toContain("schema-valid");
    }
  });

  it("fails when a synthetic song is marked published (P1-5)", () => {
    const r = build("synthetic-published", {
      songs: { "synthetic-published.yaml": join(FIXTURES, "invalid-songs", "synthetic-published.yaml") },
    });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/synthetic songs can never be "published" \(PRD §3 P1-5\)/);
  });

  it("fails in preview mode too: a synthetic song can never be published", () => {
    const r = build("synthetic-published-preview", {
      songs: { "synthetic-published.yaml": join(FIXTURES, "invalid-songs", "synthetic-published.yaml") },
      env: { KLA_SITE_MODE: "preview" },
    });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/P1-5/);
  });

  it("fails when a credit names a person who does not exist", () => {
    const r = build("unknown-person", {
      songs: { "schema-valid.yaml": join(FIXTURES, "valid-songs", "schema-valid.yaml") },
      people: { "singer-one": PEOPLE["singer-one"] ?? "" },
    });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/unknown person "composer-one"/);
  });

  it("fails when a credit basis contradicts the person record", () => {
    const r = build("deceased-own-choice", {
      songs: { "schema-valid.yaml": join(FIXTURES, "valid-songs", "schema-valid.yaml") },
      people: { ...PEOPLE, "singer-one": "slug: singer-one\ndisplay_name: Singer One\nis_living: false\ndeath_year: 1990\n" },
    });
    expect(r.status).not.toBe(0);
    expect(r.output).toMatch(/"singer-one" is deceased/);
  });
});
