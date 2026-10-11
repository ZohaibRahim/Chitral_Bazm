// T-03: publishability (PRD v3.1 §6) and the catalog filter.
// The "SQL parity" block mirrors section 6 of spec/sql/future_schema_test.sql; differences are listed in
// LYRIC_RULE_DIFFERENCES_FROM_SQL (src/lib/rights/publishability.ts).
import { describe, expect, it } from "vitest";
import { songSchema, type EvidenceRecord, type Song } from "../../src/lib/content/schemas";
import {
  LYRIC_RULE_DIFFERENCES_FROM_SQL,
  evidenceBlockers,
  publishability,
  resolveSiteMode,
  selectCatalog,
} from "../../src/lib/rights/publishability";

// Placeholder data only (bracketed text), never real lyrics.
const permission = { grade: "E4", evidence_ids: ["EV-0001"], license: "non-exclusive display v1", legal_advice_confirmed: false };

function song(edit: (s: Record<string, any>) => void = () => {}): Song {
  const raw: Record<string, any> = {
    schema_version: 1,
    slug: "real-shaped-song",
    status: "published",
    synthetic: false,
    titles: { khw_arab: "[ٹیسٹ]", roman_popular: "Test" },
    credits: [{ role: "lyricist", traditional: true }],
    rights: { lyric: { ...permission }, transliteration: { ...permission }, translation_en: { ...permission } },
    provenance: [{ source_id: "SRC-0001", type: "oral" }],
    review: { transcribed_by: "editor", second_reader: "reviewer", verified_on: "2026-10-11" },
    stanzas: [
      {
        n: 1,
        lines: [{ id: "l1", lang: "khw", script: "Arab", text: "[ݰ]", renderings: { roman_popular: "[roman]", en: "[english]" } }],
      },
    ],
    changelog: [{ date: "2026-10-11", by: "dev", note: "unit test" }],
  };
  edit(raw);
  return songSchema.parse(raw);
}

const codes = (s: Song) => publishability(s).reasons.map((r) => r.code);

describe("baseline", () => {
  it("a complete, reviewed, permission-backed song is publishable", () => {
    expect(publishability(song())).toEqual({ publishable: true, reasons: [], legalValidity: "not_assessed_by_build" });
  });

  it("never claims legal validity, even when publishable", () => {
    expect(publishability(song()).legalValidity).toBe("not_assessed_by_build");
  });

  it("documents how the rule differs from the SQL view", () => {
    expect(LYRIC_RULE_DIFFERENCES_FROM_SQL.length).toBeGreaterThan(0);
  });
});

describe("SQL parity (future_schema_test.sql §6)", () => {
  it("no evidence -> not publishable", () => {
    expect(evidenceBlockers("lyric", undefined).map((r) => r.code)).toEqual(["lyric.missing"]);
    expect(codes(song((s) => (s["rights"].lyric = { grade: "E0", evidence_ids: [], legal_advice_confirmed: false })))).toContain(
      "lyric.grade_insufficient",
    );
  });

  it("E3 without legal confirmation -> not publishable", () => {
    expect(codes(song((s) => (s["rights"].lyric = { grade: "E3", evidence_ids: ["EV-1"], legal_advice_confirmed: false })))).toEqual([
      "lyric.legal_confirmation_missing",
    ]);
  });

  it("E4 permission -> publishable", () => {
    expect(publishability(song()).publishable).toBe(true);
  });

  it("revoked permission -> not publishable", () => {
    expect(codes(song((s) => (s["rights"].lyric.revoked_on = "2026-10-11")))).toEqual(["lyric.revoked"]);
  });

  it("'best grade ignores revoked' has no YAML equivalent: one record per layer (documented difference)", () => {
    expect(LYRIC_RULE_DIFFERENCES_FROM_SQL[0]).toMatch(/one evidence record per layer/);
  });
});

describe("evidence grades", () => {
  it.each(["E0", "E1"])("%s is always blocked", (grade) => {
    const ids = grade === "E0" ? [] : ["EV-1"];
    const s = song((x) => (x["rights"].lyric = { grade, evidence_ids: ids, legal_advice_confirmed: true }));
    expect(codes(s)).toEqual(["lyric.grade_insufficient"]);
  });

  it.each(["E2", "E3"])("%s without legal confirmation is blocked", (grade) => {
    const s = song((x) => (x["rights"].lyric = { grade, evidence_ids: ["EV-1"], legal_advice_confirmed: false }));
    expect(codes(s)).toEqual(["lyric.legal_confirmation_missing"]);
  });

  it.each(["E2", "E3"])("%s with legal confirmation is publishable when everything else is complete", (grade) => {
    const s = song((x) => (x["rights"].lyric = { grade, evidence_ids: ["EV-1"], legal_advice_confirmed: true }));
    expect(publishability(s).publishable).toBe(true);
  });

  it("E2 with legal confirmation is still blocked by other requirements (no second reader)", () => {
    const s = song((x) => {
      x["rights"].lyric = { grade: "E2", evidence_ids: ["EV-1"], legal_advice_confirmed: true };
      delete x["review"].second_reader;
    });
    expect(codes(s)).toEqual(["review.second_reader_missing"]);
  });

  it.each(["E4", "E5"])("%s with complete evidence is publishable", (grade) => {
    expect(publishability(song((x) => (x["rights"].lyric.grade = grade))).publishable).toBe(true);
  });

  it.each(["E4", "E5"])("%s without a recorded license (scope of permission) is blocked", (grade) => {
    const s = song((x) => {
      x["rights"].lyric.grade = grade;
      delete x["rights"].lyric.license;
    });
    expect(codes(s)).toEqual(["lyric.license_missing"]);
  });

  it("E4 with no evidence documents is blocked (defence in depth; the schema also rejects it)", () => {
    const record: EvidenceRecord = { grade: "E4", evidence_ids: [], license: "x", legal_advice_confirmed: false };
    expect(evidenceBlockers("lyric", record).map((r) => r.code)).toEqual(["lyric.no_evidence_ids"]);
  });

  it("a future-dated revocation also blocks", () => {
    expect(codes(song((x) => (x["rights"].lyric.revoked_on = "2099-01-01")))).toEqual(["lyric.revoked"]);
  });
});

describe("independent review (D-12)", () => {
  it("missing second reader blocks", () => {
    expect(codes(song((x) => delete x["review"].second_reader))).toEqual(["review.second_reader_missing"]);
  });

  it("second reader identical to the transcriber blocks (case and spacing ignored)", () => {
    expect(codes(song((x) => (x["review"].second_reader = "  Editor ")))).toEqual(["review.not_independent"]);
  });

  it("missing verification date blocks", () => {
    expect(codes(song((x) => delete x["review"].verified_on))).toEqual(["review.verified_on_missing"]);
  });

  it("missing review record blocks", () => {
    const s = song();
    delete (s as { review?: unknown }).review;
    expect(codes(s)).toEqual(["review.missing"]);
  });
});

describe("rendering layers need their own records", () => {
  it("Roman shown without a transliteration record blocks", () => {
    expect(codes(song((x) => delete x["rights"].transliteration))).toEqual(["transliteration.missing"]);
  });

  it("English shown with an unconfirmed E3 translation record blocks", () => {
    const s = song((x) => (x["rights"].translation_en = { grade: "E3", evidence_ids: ["EV-2"], legal_advice_confirmed: false }));
    expect(codes(s)).toEqual(["translation_en.legal_confirmation_missing"]);
  });

  it("a revoked translation record blocks", () => {
    expect(codes(song((x) => (x["rights"].translation_en.revoked_on = "2026-10-11")))).toEqual(["translation_en.revoked"]);
  });

  it("a layer that is not displayed needs no record", () => {
    const s = song((x) => {
      delete x["rights"].translation_en;
      delete x["stanzas"][0].lines[0].renderings.en;
    });
    expect(publishability(s).publishable).toBe(true);
  });

  it("roman_editorial alone also requires the transliteration record", () => {
    const s = song((x) => {
      delete x["rights"].transliteration;
      x["stanzas"][0].lines[0].renderings = { roman_editorial: "[roman]", en: "[english]" };
    });
    expect(codes(s)).toEqual(["transliteration.missing"]);
  });
});

describe("editorial status is separate from publishability", () => {
  it.each(["draft", "in_review", "withdrawn"])("status %s is not publishable even with complete rights", (status) => {
    expect(codes(song((x) => (x["status"] = status)))).toEqual(["status_not_published"]);
  });

  it("status published is not enough on its own", () => {
    const s = song((x) => (x["rights"].lyric = { grade: "E1", evidence_ids: ["EV-1"], legal_advice_confirmed: false }));
    expect(s.status).toBe("published");
    expect(publishability(s).publishable).toBe(false);
  });

  it("reports every blocking reason, not just the first", () => {
    const s = song((x) => {
      x["status"] = "draft";
      delete x["rights"].transliteration;
      delete x["review"].second_reader;
    });
    expect(codes(s)).toEqual(["status_not_published", "transliteration.missing", "review.second_reader_missing"]);
  });
});

describe("synthetic content", () => {
  const synthetic = (status: string) =>
    song((x) => {
      x["synthetic"] = true;
      x["status"] = status;
      x["slug"] = `synthetic-${status.replace("_", "-")}`;
    });

  it("is never publishable, even with complete rights", () => {
    expect(codes(synthetic("draft"))).toEqual(["synthetic", "status_not_published"]);
  });

  it("the schema rejects a synthetic song marked published (P1-5)", () => {
    expect(() => synthetic("published")).toThrow(/P1-5/);
  });

  it("is excluded from the production catalog", () => {
    expect(selectCatalog([synthetic("draft"), synthetic("in_review")], "production")).toEqual([]);
  });

  it("appears in development and preview, always noindex, but not when withdrawn", () => {
    const songs = [synthetic("draft"), synthetic("withdrawn")];
    for (const mode of ["development", "preview"] as const) {
      expect(selectCatalog(songs, mode).map((e) => [e.song.slug, e.noindex])).toEqual([["synthetic-draft", true]]);
    }
  });
});

describe("catalog filter", () => {
  const publishable = song((x) => (x["slug"] = "ok"));
  const draft = song((x) => {
    x["slug"] = "draft";
    x["status"] = "draft";
  });
  const unreviewed = song((x) => {
    x["slug"] = "unreviewed";
    delete x["review"].second_reader;
  });

  it("production contains only publishable songs, indexable", () => {
    expect(selectCatalog([publishable, draft, unreviewed], "production")).toEqual([{ song: publishable, noindex: false }]);
  });

  it("non-publishable real songs are excluded in every mode", () => {
    for (const mode of ["production", "preview", "development"] as const) {
      expect(selectCatalog([draft, unreviewed], mode)).toEqual([]);
    }
  });

  it("preview and development mark everything noindex", () => {
    expect(selectCatalog([publishable], "preview")).toEqual([{ song: publishable, noindex: true }]);
  });
});

describe("site mode", () => {
  it("resolves dev, preview and production", () => {
    expect(resolveSiteMode({ dev: true, siteModeEnv: "production" })).toBe("development");
    expect(resolveSiteMode({ dev: false, siteModeEnv: undefined })).toBe("production");
    expect(resolveSiteMode({ dev: false, siteModeEnv: "preview" })).toBe("preview");
  });

  it("rejects unknown values instead of guessing", () => {
    expect(() => resolveSiteMode({ dev: false, siteModeEnv: "staging" })).toThrow(/KLA_SITE_MODE/);
  });
});
