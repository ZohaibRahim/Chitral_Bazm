// Controlled vocabularies for content validation (PRD v3.1 §5, §7).
// Values mirror spec/sql/future_schema.sql where an equivalent exists.

export const SONG_STATUSES = ["draft", "in_review", "published", "withdrawn"] as const;

// Credit roles: same list as the `credits.role` CHECK constraint in future_schema.sql.
export const CREDIT_ROLES = [
  "lyricist",
  "composer",
  "singer",
  "transcriber",
  "translator_en",
  "romanizer",
  "reviewer",
] as const;

export const CREDIT_VISIBILITIES = ["public", "initials", "withheld"] as const;

// PRD §7: how a credit's visibility was decided.
export const VISIBILITY_BASES = [
  "own_choice",
  "family_choice",
  "official_release_credit",
  "default_withheld",
] as const;

// Internal evidence grades, NOT legal classifications (PRD §6).
export const EVIDENCE_GRADES = ["E0", "E1", "E2", "E3", "E4", "E5"] as const;

// Languages allowed on an original lyric line. Both are written in Arabic script (PRD §8).
export const LINE_LANGS = ["khw", "ur"] as const;
export const LINE_SCRIPTS = ["Arab"] as const;

// Per-line layers beneath the original text (PRD §5).
export const RENDERING_KEYS = ["roman_popular", "roman_editorial", "en"] as const;

// Same values as `source_records.kind` in future_schema.sql.
export const PROVENANCE_TYPES = ["print", "recording", "manuscript", "oral", "web"] as const;

// D-16b (2026-10-11): provisional classifications; the primary Khowar editor may refine them.
export const GENRES: readonly string[] = [
  "folk",
  "traditional",
  "ghazal",
  "dialogue-song",
  "wedding-song",
  "elegy",
  "devotional",
  "contemporary",
  "childrens-song",
];
