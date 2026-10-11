// Publishability (PRD v3.1 §6) and the build-time catalog filter (T-03).
//
// Editorial status says what the editor intends; publishability is derived from the records and decides what is
// emitted. A song can be `status: published` and still not publishable.
//
// What this checks is TECHNICAL COMPLETENESS of the recorded evidence. It cannot establish LEGAL VALIDITY:
// an E4/E5 grade only means documented permission is claimed. Whether a document is genuine, covers this use and was
// given by the right person is checked by humans against the private evidence store (D-13b) and, where needed,
// legal advice (PRD §6 L-1 to L-9). Every result therefore carries `legalValidity: "not_assessed_by_build"`.
//
// Mirrors the SQL view `song_publishability` in spec/sql/future_schema.sql for the lyric layer, plus
// application-level checks the view does not contain (see LYRIC_RULE_DIFFERENCES_FROM_SQL).
import type { EvidenceRecord, Song } from "../content/schemas";

export type RightsLayer = "lyric" | "transliteration" | "translation_en";

export type BlockReason = { code: string; message: string };

export type Publishability = {
  publishable: boolean;
  reasons: BlockReason[];
  legalValidity: "not_assessed_by_build";
};

/** Differences from the SQL view, documented for the parity requirement in PRD §6. */
export const LYRIC_RULE_DIFFERENCES_FROM_SQL = [
  "YAML holds one evidence record per layer; SQL allows several rows and takes the best unrevoked one. Superseded records live in git history and the changelog.",
  "Any revoked_on value revokes the record, matching `revoked_at is null` in SQL; a future-dated revocation also blocks.",
  "Application-level: a qualifying record must list at least one evidence id (E0 has none by definition).",
  "Application-level: E4/E5 must record the scope of permission in `license`. The SQL view does not require it.",
  "Application-level: the song must be non-synthetic, status published, independently second-read and verified, and every displayed rendering layer needs its own qualifying record. The SQL view covers the lyric layer only.",
] as const;

const reason = (code: string, message: string): BlockReason => ({ code, message });

/** Why a single layer's evidence record does not qualify. Empty means it qualifies. */
export function evidenceBlockers(layer: RightsLayer, record: EvidenceRecord | undefined): BlockReason[] {
  if (record === undefined) {
    return [reason(`${layer}.missing`, `no rights evidence recorded for the ${layer} layer`)];
  }
  const out: BlockReason[] = [];
  if (record.revoked_on !== undefined) {
    out.push(reason(`${layer}.revoked`, `${layer} evidence was revoked on ${record.revoked_on.toISOString().slice(0, 10)}`));
  }
  switch (record.grade) {
    case "E0":
    case "E1":
      out.push(reason(`${layer}.grade_insufficient`, `${layer} evidence grade ${record.grade} never permits publication`));
      break;
    case "E2":
    case "E3":
      if (!record.legal_advice_confirmed) {
        out.push(
          reason(`${layer}.legal_confirmation_missing`, `${layer} evidence grade ${record.grade} needs recorded legal confirmation (PRD §6, D-14)`),
        );
      }
      break;
    case "E4":
    case "E5":
      if (record.license === undefined) {
        out.push(
          reason(`${layer}.license_missing`, `${layer} evidence grade ${record.grade} claims permission but does not record its scope in "license"`),
        );
      }
      break;
  }
  if (record.grade !== "E0" && record.grade !== "E1" && record.evidence_ids.length === 0) {
    out.push(reason(`${layer}.no_evidence_ids`, `${layer} evidence lists no documents in the private store`));
  }
  return out;
}

/** Rendering layers that appear on at least one line, and therefore would be displayed. */
export function displayedLayers(song: Song): Set<Exclude<RightsLayer, "lyric">> {
  const layers = new Set<Exclude<RightsLayer, "lyric">>();
  for (const stanza of song.stanzas) {
    for (const line of stanza.lines) {
      if (line.renderings.roman_popular !== undefined || line.renderings.roman_editorial !== undefined) {
        layers.add("transliteration");
      }
      if (line.renderings.en !== undefined) layers.add("translation_en");
    }
  }
  return layers;
}

const sameReader = (a: string, b: string) => a.trim().toLocaleLowerCase("en") === b.trim().toLocaleLowerCase("en");

function reviewBlockers(song: Song): BlockReason[] {
  const review = song.review;
  if (review === undefined) return [reason("review.missing", "no editorial review record")];
  const out: BlockReason[] = [];
  if (review.second_reader === undefined) {
    out.push(reason("review.second_reader_missing", "no independent second reader recorded (D-12)"));
  } else if (sameReader(review.second_reader, review.transcribed_by)) {
    out.push(reason("review.not_independent", "the second reader must be a different person from the transcriber (D-12)"));
  }
  if (review.verified_on === undefined) {
    out.push(reason("review.verified_on_missing", "no verification date recorded"));
  }
  return out;
}

/**
 * PRD §6 build-time rule:
 *   !synthetic && status == "published" && lyric layer qualifies && every displayed rendering layer qualifies
 *   && an independent second reader has verified the text.
 */
export function publishability(song: Song): Publishability {
  const reasons: BlockReason[] = [];
  if (song.synthetic) reasons.push(reason("synthetic", "synthetic content is never publishable"));
  if (song.status !== "published") {
    reasons.push(reason("status_not_published", `editorial status is "${song.status}"`));
  }
  reasons.push(...evidenceBlockers("lyric", song.rights.lyric));
  for (const layer of displayedLayers(song)) {
    reasons.push(...evidenceBlockers(layer, song.rights[layer]));
  }
  reasons.push(...reviewBlockers(song));
  return { publishable: reasons.length === 0, reasons, legalValidity: "not_assessed_by_build" };
}

// ---------------------------------------------------------------------------
// Catalog filter: the single gate for pages, the search index and the sitemap.
// ---------------------------------------------------------------------------

/**
 * production: public build (default for `astro build`).
 * preview:    unlisted Phase 1 preview (KLA_SITE_MODE=preview). Synthetic songs shown, everything noindex.
 * development: `astro dev`. Synthetic songs shown with noindex.
 */
export type SiteMode = "production" | "preview" | "development";

export function resolveSiteMode(input: { dev: boolean; siteModeEnv: string | undefined }): SiteMode {
  if (input.dev) return "development";
  const value = input.siteModeEnv;
  if (value === undefined || value === "" || value === "production") return "production";
  if (value === "preview") return "preview";
  throw new Error(`KLA_SITE_MODE must be "production" or "preview", got "${value}"`);
}

export type CatalogEntry = { song: Song; noindex: boolean };

/**
 * Songs that may be emitted in this mode.
 * - Real (non-synthetic) songs appear only when publishable, in every mode.
 * - Synthetic songs appear only outside production, always noindex, and never when withdrawn.
 * Throws if the production catalog would contain synthetic content (P1-5 defence in depth).
 */
export function selectCatalog(songs: readonly Song[], mode: SiteMode): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const song of songs) {
    if (song.synthetic) {
      if (mode !== "production" && song.status !== "withdrawn") entries.push({ song, noindex: true });
      continue;
    }
    if (publishability(song).publishable) entries.push({ song, noindex: mode !== "production" });
  }
  if (mode === "production") {
    const leaked = entries.filter((e) => e.song.synthetic).map((e) => e.song.slug);
    if (leaked.length > 0) throw new Error(`synthetic songs in production catalog: ${leaked.join(", ")} (P1-5)`);
  }
  return entries;
}
