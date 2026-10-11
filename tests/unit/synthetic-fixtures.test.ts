// T-05: the three synthetic Phase 1 fixtures in src/content/songs/ meet the PRD §3 coverage list.
// That they load through the real Astro collections is checked by tests/build/content-build.test.ts.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDocument } from "yaml";
import { loadPeopleFromDisk } from "../../src/lib/content/people-on-disk";
import { songSchema, type Song } from "../../src/lib/content/schemas";
import { creditIssues } from "../../src/lib/credits/visibility";
import { publishability, selectCatalog } from "../../src/lib/rights/publishability";
import { positionalForms, type Form } from "./helpers/joining";

const SONGS = new URL("../../src/content/songs/", import.meta.url);
const PEOPLE = new URL("../../src/content/people/", import.meta.url);
const KHOWAR = ["ݮ", "ݯ", "ݰ", "ݱ", "ځ", "څ"];

const files = readdirSync(SONGS).filter((f) => /\.ya?ml$/.test(f)).sort();
const songs: Song[] = files.map((f) => {
  const doc = parseDocument(readFileSync(new URL(f, SONGS), "utf8"), { customTags: ["timestamp"], merge: true, schema: "core" });
  return songSchema.parse(doc.toJS());
});
const lines = songs.flatMap((s) => s.stanzas.flatMap((st) => st.lines.map((l) => ({ song: s.slug, ...l }))));

describe("fixture set", () => {
  it("is exactly three synthetic drafts that pass the song schema", () => {
    expect(files).toEqual(["test-fixture-01.yaml", "test-fixture-02.yaml", "test-fixture-03.yaml"]);
    for (const s of songs) {
      expect(s.synthetic, s.slug).toBe(true);
      expect(s.status, s.slug).toBe("draft");
    }
  });

  it("claims no permission: every rights record is E0 with no evidence", () => {
    for (const s of songs) {
      for (const record of [s.rights.lyric, s.rights.transliteration, s.rights.translation_en]) {
        expect(record).toEqual({ grade: "E0", evidence_ids: [], legal_advice_confirmed: false });
      }
    }
  });

  it("credits resolve to the fictitious test people with consistent records", () => {
    const people = loadPeopleFromDisk(fileURLToPath(PEOPLE));
    expect([...people.keys()].sort()).toEqual(["test-person-a", "test-person-b", "test-person-c"]);
    for (const p of people.values()) expect(p.display_name).toMatch(/^Test Person [A-C]$/);
    for (const s of songs) for (const c of s.credits) expect(creditIssues(c, people), s.slug).toEqual([]);
  });

  it("are marked synthetic in the text itself, not only in metadata", () => {
    for (const f of files) expect(readFileSync(new URL(f, SONGS), "utf8")).toMatch(/^# SYNTHETIC TEST FIXTURE/);
  });
});

describe("joining-form helper (known answers)", () => {
  const formOf = (text: string, ch: string) => positionalForms(text).find((x) => x.ch === ch)?.form;

  it("classifies a dual-joining letter in each position", () => {
    expect(formOf("ݰ", "ݰ")).toBe("isolated");
    expect(formOf("ݰب", "ݰ")).toBe("initial");
    expect(formOf("بݰب", "ݰ")).toBe("medial");
    expect(formOf("بݰ", "ݰ")).toBe("final");
    expect(formOf("اݰ", "ݰ")).toBe("isolated"); // alef does not join to the following letter
  });

  it("never gives a right-joining letter an initial or medial form", () => {
    expect(formOf("ݱب", "ݱ")).toBe("isolated");
    expect(formOf("بݱب", "ݱ")).toBe("final");
  });

  it("skips diacritics when finding neighbours", () => {
    expect(formOf("بَݰَب", "ݰ")).toBe("medial");
  });
});

describe("PRD §3 coverage list", () => {
  it("contains every Khowar-specific letter", () => {
    const all = lines.map((l) => l.text).join(" ");
    for (const ch of KHOWAR) expect(all, ch).toContain(ch);
  });

  it("has every applicable joining form of every Khowar letter (Unicode joining types)", () => {
    const seen = new Map<string, Set<Form>>(KHOWAR.map((ch) => [ch, new Set<Form>()]));
    for (const l of lines.filter((x) => x.lang === "khw")) {
      for (const { ch, form } of positionalForms(l.text)) seen.get(ch)?.add(form);
    }
    const all: Form[] = ["isolated", "initial", "medial", "final"];
    for (const ch of ["ݮ", "ݯ", "ݰ", "ځ", "څ"]) expect([...(seen.get(ch) ?? [])].sort(), ch).toEqual([...all].sort());
    // ݱ is right-joining (type R): it has no initial or medial form.
    expect([...(seen.get("ݱ") ?? [])].sort()).toEqual(["final", "isolated"]);
  });

  it("has an Urdu line inside a song whose other lines are Khowar", () => {
    const withUrdu = songs.filter((s) => {
      const langs = s.stanzas.flatMap((st) => st.lines.map((l) => l.lang));
      return langs.includes("ur") && langs.includes("khw");
    });
    expect(withUrdu.length).toBeGreaterThanOrEqual(1);
  });

  it("has a Latin name and a number inside RTL lines", () => {
    expect(lines.some((l) => /[A-Za-z]{3,}/.test(l.text))).toBe(true);
    expect(lines.some((l) => /[0-9۰-۹]/.test(l.text) && l.lang === "khw")).toBe(true);
  });

  it("has a line long enough to wrap at 360 px (wrapping itself is checked in the T-09 e2e test)", () => {
    expect(Math.max(...lines.map((l) => [...l.text].length))).toBeGreaterThanOrEqual(80);
  });

  it("has a stanza with Roman but no English layer", () => {
    const romanOnly = songs.flatMap((s) => s.stanzas).filter((st) =>
      st.lines.every((l) => l.renderings.roman_popular !== undefined && l.renderings.en === undefined),
    );
    expect(romanOnly.length).toBeGreaterThanOrEqual(1);
  });

  it("has several stanzas per song and lines of different lengths", () => {
    for (const s of songs) expect(s.stanzas.length, s.slug).toBeGreaterThanOrEqual(3);
    expect(new Set(lines.map((l) => [...l.text].length)).size).toBeGreaterThanOrEqual(8);
  });

  it("has diacritics on Khowar letters", () => {
    expect(lines.some((l) => /[ݮݯݰݱځڅ][ً-ْ]/u.test(l.text))).toBe(true);
  });

  it("keeps line ids unique within each song", () => {
    for (const s of songs) {
      const ids = s.stanzas.flatMap((st) => st.lines.map((l) => l.id));
      expect(new Set(ids).size, s.slug).toBe(ids.length);
    }
  });

  it("gives search tests (T-11) different aliases, Roman misspellings and Urdu-keyboard substitutes", () => {
    for (const s of songs) {
      expect(s.aliases?.length ?? 0, s.slug).toBeGreaterThanOrEqual(3);
      expect(new Set(s.aliases).size, s.slug).toBe(s.aliases?.length);
    }
    // Arabic-script aliases that replace Khowar letters with the Urdu-keyboard letters folded to by PRD §9.
    expect(songs.flatMap((s) => s.aliases ?? []).some((a) => /[جچشژز]/.test(a))).toBe(true);
  });
});

describe("never public", () => {
  it("no fixture is publishable", () => {
    for (const s of songs) expect(publishability(s).publishable, s.slug).toBe(false);
  });

  it("the production catalog (the only source for pages, search and sitemap) is empty", () => {
    expect(selectCatalog(songs, "production")).toEqual([]);
  });

  it("development and preview show all three, noindex", () => {
    for (const mode of ["development", "preview"] as const) {
      const entries = selectCatalog(songs, mode);
      expect(entries.map((e) => e.song.slug)).toEqual(["test-fixture-01", "test-fixture-02", "test-fixture-03"]);
      expect(entries.every((e) => e.noindex)).toBe(true);
    }
  });
});
