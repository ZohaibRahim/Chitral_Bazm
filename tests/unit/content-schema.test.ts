// T-02: content schemas (PRD v3.1 §5). One valid fixture and one invalid fixture per defect.
import { describe, expect, it } from "vitest";
import { personSchema, slugIdFromFile, songSchema } from "../../src/lib/content/schemas";
import { listFixtures, readYamlFixture } from "./helpers/content";

type Expected = { path: string; message: RegExp };

// Every file in tests/fixtures/invalid-songs/ must be listed here with the error it must produce.
const INVALID_SONGS: Record<string, Expected> = {
  "bad-slug.yaml": { path: "slug", message: /kebab-case/ },
  "credit-without-person.yaml": { path: "credits.0.person", message: /either "traditional: true" or a "person"/ },
  "duplicate-line-id.yaml": { path: "stanzas.0.lines.1.id", message: /duplicate line id "l1"/ },
  "empty-renderings.yaml": { path: "stanzas.0.lines.0.renderings", message: /at least one of roman_popular/ },
  "evidence-file-path.yaml": { path: "rights.lyric.evidence_ids.0", message: /never file paths/ },
  "line-text-not-arabic.yaml": { path: "stanzas.0.lines.0.text", message: /must contain Arabic-script letters/ },
  "missing-line-lang.yaml": { path: "stanzas.0.lines.0.lang", message: /./ },
  "non-synthetic-without-provenance.yaml": { path: "provenance", message: /required for non-synthetic/ },
  "own-choice-without-date.yaml": { path: "credits.1.recorded_on", message: /recorded with a date/ },
  "public-credit-default-basis.yaml": { path: "credits.1.visibility", message: /rule 8/ },
  "published-without-review.yaml": { path: "review", message: /required when status is "published"/ },
  "swapped-layers.yaml": { path: "stanzas.0.lines.0.renderings.roman_popular", message: /layers are not swapped/ },
  "traditional-credit-with-person.yaml": { path: "credits.0.person", message: /rule 7/ },
  "unknown-field.yaml": { path: "", message: /Unrecognized key.*phone/ },
  "unknown-rendering-key.yaml": { path: "stanzas.0.lines.0.renderings", message: /Unrecognized key.*english/ },
};

describe("song schema: valid fixture", () => {
  it("accepts the synthetic schema fixture and keeps text unchanged", () => {
    const raw = readYamlFixture("valid-songs/schema-valid.yaml") as { stanzas: { lines: { text: string }[] }[] };
    const result = songSchema.safeParse(raw);
    expect(result.success, JSON.stringify(result.error?.issues, null, 2)).toBe(true);
    if (!result.success) return;
    expect(result.data.stanzas[0]?.lines[0]?.text).toBe(raw.stanzas[0]?.lines[0]?.text);
    expect(result.data.credits[0]).toEqual({ role: "lyricist", traditional: true });
    expect(result.data.credits[1]).toMatchObject({ traditional: false, person: "singer-one", visibility_basis: "own_choice" });
  });
});

describe("song schema: invalid fixtures", () => {
  it("has an expectation for every invalid fixture (and at least eight)", () => {
    const files = listFixtures("invalid-songs");
    expect(files).toEqual(Object.keys(INVALID_SONGS).sort());
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const [file, expected] of Object.entries(INVALID_SONGS)) {
    it(`rejects ${file} at "${expected.path || "(root)"}"`, () => {
      const result = songSchema.safeParse(readYamlFixture(`invalid-songs/${file}`));
      expect(result.success).toBe(false);
      const issues = result.error?.issues ?? [];
      const match = issues.find((i) => i.path.join(".") === expected.path && expected.message.test(i.message));
      expect(match, `issues were:\n${JSON.stringify(issues, null, 2)}`).toBeDefined();
    });
  }
});

describe("slug and file name", () => {
  it("uses the slug as the entry id when it matches the file name", () => {
    expect(slugIdFromFile("test-song-01.yaml", { slug: "test-song-01" })).toBe("test-song-01");
  });

  it("fails when slug and file name differ, so duplicate slugs cannot exist", () => {
    expect(() => slugIdFromFile("test-song-01.yaml", { slug: "test-song-02" })).toThrow(/must equal the file name/);
  });
});

describe("person schema (PRD §5, §7 rule 5)", () => {
  it("accepts a minimal person", () => {
    expect(personSchema.safeParse({ slug: "singer-one", display_name: "Singer One", is_living: true }).success).toBe(true);
  });

  it("rejects contact, photo or location fields", () => {
    for (const field of ["phone", "photo", "village", "email"]) {
      const result = personSchema.safeParse({ slug: "p", display_name: "P", [field]: "x" });
      expect(result.success, field).toBe(false);
      expect(result.error?.issues[0]?.message).toMatch(new RegExp(`Unrecognized key.*${field}`));
    }
  });

  it("rejects a death_year on someone not recorded as deceased", () => {
    const result = personSchema.safeParse({ slug: "p", display_name: "P", is_living: true, death_year: 1990 });
    expect(result.error?.issues[0]).toMatchObject({ path: ["is_living"] });
  });

  it("rejects a name_khw_arab without Arabic-script letters", () => {
    const result = personSchema.safeParse({ slug: "p", display_name: "P", name_khw_arab: "Latin only" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["name_khw_arab"] });
  });
});
