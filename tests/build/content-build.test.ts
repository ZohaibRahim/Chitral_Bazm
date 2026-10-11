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
