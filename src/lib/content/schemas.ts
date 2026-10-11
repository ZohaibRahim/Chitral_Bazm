// Content schemas for songs and people (PRD v3.1 §5, §7).
// Pure Zod, independent of Astro's runtime, so the same schemas run in the build and in unit tests.
// Text values are validated but never transformed: the approved Khowar text is stored exactly as written.
import { z } from "astro/zod";
import {
  CREDIT_ROLES,
  CREDIT_VISIBILITIES,
  EVIDENCE_GRADES,
  GENRES,
  LINE_LANGS,
  LINE_SCRIPTS,
  PROVENANCE_TYPES,
  SONG_STATUSES,
  VISIBILITY_BASES,
} from "../../content/vocab";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ARABIC_LETTER = /(?=\p{L})\p{Script=Arabic}/u;
// Opaque pointers into the private evidence store (D-13b). No slashes, so file paths cannot be stored.
const EVIDENCE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

const nonBlank = (field: string) =>
  z.string().refine((s) => s.trim().length > 0, { message: `${field} must not be empty or whitespace` });

const slug = (field: string) =>
  z.string().regex(KEBAB, { message: `${field} must be kebab-case (lowercase letters, digits, single hyphens)` });

const arabicScriptText = (field: string) =>
  nonBlank(field).refine((s) => ARABIC_LETTER.test(s), {
    message: `${field} must contain Arabic-script letters (Khowar/Urdu original text)`,
  });

const latinLayerText = (field: string) =>
  nonBlank(field).refine((s) => !ARABIC_LETTER.test(s), {
    message: `${field} must not contain Arabic-script letters; check that the layers are not swapped`,
  });

const date = z.coerce.date();

/** The id Astro uses for an entry must equal its `slug`, so slugs are unique per collection by file name. */
export function slugIdFromFile(entry: string, data: Record<string, unknown>): string {
  const fileSlug = entry.replace(/\.ya?ml$/, "");
  if (data["slug"] !== fileSlug) {
    throw new Error(`${entry}: slug "${String(data["slug"])}" must equal the file name "${fileSlug}"`);
  }
  return fileSlug;
}

// ---------------------------------------------------------------------------
// Credits (PRD §7)
// ---------------------------------------------------------------------------

const creditInput = z.strictObject({
  role: z.enum(CREDIT_ROLES),
  traditional: z.literal(true).optional(),
  person: slug("credits[].person").optional(),
  visibility: z.enum(CREDIT_VISIBILITIES).optional(),
  visibility_basis: z.enum(VISIBILITY_BASES).optional(),
  recorded_on: date.optional(),
});

export type TraditionalCredit = { role: (typeof CREDIT_ROLES)[number]; traditional: true };
export type PersonCredit = {
  role: (typeof CREDIT_ROLES)[number];
  traditional: false;
  person: string;
  visibility: (typeof CREDIT_VISIBILITIES)[number];
  visibility_basis: (typeof VISIBILITY_BASES)[number];
  recorded_on?: Date;
};
export type Credit = TraditionalCredit | PersonCredit;

export const creditSchema = creditInput
  .superRefine((c, ctx) => {
    if (c.traditional) {
      for (const key of ["person", "visibility", "visibility_basis", "recorded_on"] as const) {
        if (c[key] !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `a traditional credit has no person or visibility fields (PRD §7 rule 7); remove "${key}"`,
          });
        }
      }
      return;
    }
    if (c.person === undefined) {
      ctx.addIssue({ code: "custom", path: ["person"], message: 'a credit needs either "traditional: true" or a "person"' });
    }
    if (c.visibility === undefined) {
      ctx.addIssue({ code: "custom", path: ["visibility"], message: "a person credit needs visibility: public | initials | withheld" });
    }
    if (c.visibility_basis === undefined) {
      ctx.addIssue({ code: "custom", path: ["visibility_basis"], message: "a person credit needs a visibility_basis recording how visibility was decided" });
    }
    if (c.visibility_basis === "default_withheld" && c.visibility !== undefined && c.visibility !== "withheld") {
      ctx.addIssue({
        code: "custom",
        path: ["visibility"],
        message: `visibility "${c.visibility}" requires a recorded basis; with default_withheld the credit must be "withheld" (PRD §7 rule 8)`,
      });
    }
    if ((c.visibility_basis === "own_choice" || c.visibility_basis === "family_choice") && c.recorded_on === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["recorded_on"],
        message: `${c.visibility_basis} must be recorded with a date in recorded_on (PRD §7 rules 1, 3)`,
      });
    }
  })
  .transform((c): Credit => {
    if (c.traditional) return { role: c.role, traditional: true };
    const credit: PersonCredit = {
      role: c.role,
      traditional: false,
      person: c.person ?? "",
      visibility: c.visibility ?? "withheld",
      visibility_basis: c.visibility_basis ?? "default_withheld",
    };
    if (c.recorded_on !== undefined) credit.recorded_on = c.recorded_on;
    return credit;
  });

// ---------------------------------------------------------------------------
// Rights evidence (PRD §5, §6). Validation of the record only; publishability is T-03.
// ---------------------------------------------------------------------------

export const evidenceSchema = z
  .strictObject({
    grade: z.enum(EVIDENCE_GRADES),
    evidence_ids: z.array(
      z.string().regex(EVIDENCE_ID, {
        message: "evidence_ids are opaque ids into the private evidence store, never file paths or documents",
      }),
    ),
    license: nonBlank("license").optional(),
    legal_advice_confirmed: z.boolean(),
    revoked_on: date.optional(),
  })
  .superRefine((e, ctx) => {
    if (e.grade === "E0" && e.evidence_ids.length > 0) {
      ctx.addIssue({ code: "custom", path: ["evidence_ids"], message: "grade E0 means nothing is documented; evidence_ids must be empty" });
    }
    if (e.grade !== "E0" && e.evidence_ids.length === 0) {
      ctx.addIssue({ code: "custom", path: ["evidence_ids"], message: `grade ${e.grade} requires at least one evidence id` });
    }
  });

// ---------------------------------------------------------------------------
// Lyrics
// ---------------------------------------------------------------------------

const renderingsSchema = z
  .strictObject({
    roman_popular: latinLayerText("roman_popular").optional(),
    roman_editorial: latinLayerText("roman_editorial").optional(),
    en: latinLayerText("en").optional(),
  })
  .refine((r) => Object.keys(r).length > 0, {
    message: "renderings must include at least one of roman_popular, roman_editorial, en",
  });

export const lineSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, { message: "line id must be lowercase letters, digits and hyphens" }),
  lang: z.enum(LINE_LANGS),
  script: z.enum(LINE_SCRIPTS),
  text: arabicScriptText("text"),
  renderings: renderingsSchema,
});

export const stanzaSchema = z.strictObject({
  n: z.number().int().min(1),
  lines: z.array(lineSchema).min(1, { message: "a stanza needs at least one line" }),
});

// ---------------------------------------------------------------------------
// Song (PRD §5)
// ---------------------------------------------------------------------------

export const songSchema = z
  .strictObject({
    schema_version: z.literal(1),
    slug: slug("slug"),
    status: z.enum(SONG_STATUSES),
    synthetic: z.boolean(),
    titles: z.strictObject({
      khw_arab: arabicScriptText("titles.khw_arab"),
      roman_popular: latinLayerText("titles.roman_popular"),
      roman_editorial: latinLayerText("titles.roman_editorial").optional(),
      en: latinLayerText("titles.en").optional(),
    }),
    aliases: z.array(nonBlank("alias")).optional(),
    genre: z
      .array(
        z.string().refine((g) => GENRES.includes(g), {
          message: "genre is not in the controlled list in src/content/vocab.ts (D-16b is open: the list is empty)",
        }),
      )
      .optional(),
    credits: z.array(creditSchema).min(1, { message: "at least one credit is required" }),
    rights: z.strictObject({
      lyric: evidenceSchema,
      transliteration: evidenceSchema.optional(),
      translation_en: evidenceSchema.optional(),
    }),
    provenance: z
      .array(
        z.strictObject({
          source_id: nonBlank("provenance[].source_id"),
          type: z.enum(PROVENANCE_TYPES),
          note: nonBlank("provenance[].note").optional(),
        }),
      )
      .optional(),
    recordings: z
      .array(
        z.strictObject({
          platform: nonBlank("recordings[].platform"),
          url: z.url({ protocol: /^https?$/, message: "recordings[].url must be an http(s) URL" }),
          official: z.boolean(),
        }),
      )
      .optional(),
    review: z
      .strictObject({
        transcribed_by: nonBlank("review.transcribed_by"),
        second_reader: nonBlank("review.second_reader").optional(),
        verified_on: date.optional(),
      })
      .optional(),
    stanzas: z.array(stanzaSchema).min(1, { message: "a song needs at least one stanza" }),
    changelog: z
      .array(z.strictObject({ date, by: nonBlank("changelog[].by"), note: nonBlank("changelog[].note") }))
      .min(1, { message: "changelog needs at least one entry" }),
  })
  .superRefine((song, ctx) => {
    if (!song.synthetic && (song.provenance === undefined || song.provenance.length === 0)) {
      ctx.addIssue({ code: "custom", path: ["provenance"], message: "provenance is required for non-synthetic songs" });
    }
    if (song.status === "published" && song.review === undefined) {
      ctx.addIssue({ code: "custom", path: ["review"], message: 'review is required when status is "published"' });
    }

    const stanzaNumbers = new Map<number, number>();
    const lineIds = new Map<string, string>();
    song.stanzas.forEach((stanza, si) => {
      const firstStanza = stanzaNumbers.get(stanza.n);
      if (firstStanza !== undefined) {
        ctx.addIssue({ code: "custom", path: ["stanzas", si, "n"], message: `duplicate stanza number ${stanza.n} (first used at stanzas[${firstStanza}])` });
      } else {
        stanzaNumbers.set(stanza.n, si);
      }
      stanza.lines.forEach((line, li) => {
        const first = lineIds.get(line.id);
        if (first !== undefined) {
          ctx.addIssue({ code: "custom", path: ["stanzas", si, "lines", li, "id"], message: `duplicate line id "${line.id}" (first used at ${first})` });
        } else {
          lineIds.set(line.id, `stanzas[${si}].lines[${li}]`);
        }
      });
    });

    const creditKeys = new Set<string>();
    song.credits.forEach((credit, ci) => {
      const key = credit.traditional ? `${credit.role}|traditional` : `${credit.role}|${credit.person}`;
      if (creditKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["credits", ci],
          message: credit.traditional
            ? `duplicate traditional credit for role "${credit.role}"`
            : `duplicate credit: "${credit.person}" is already credited as "${credit.role}"`,
        });
      }
      creditKeys.add(key);
    });
  });

export type Song = z.output<typeof songSchema>;
export type Line = z.output<typeof lineSchema>;

// ---------------------------------------------------------------------------
// Person (PRD §5, §7 rule 5: no contact, photo, location or family fields exist)
// ---------------------------------------------------------------------------

export const personSchema = z
  .strictObject({
    slug: slug("slug"),
    display_name: nonBlank("display_name"),
    name_khw_arab: arabicScriptText("name_khw_arab").optional(),
    is_living: z.boolean().optional(),
    death_year: z.number().int().min(1500).max(2100).optional(),
    // Needed for PRD §7 rule 6 (under-18s); not in the PRD §5 field list. See docs/decisions.md.
    is_minor: z.boolean().optional(),
  })
  .superRefine((p, ctx) => {
    if (p.death_year !== undefined && p.is_living !== false) {
      ctx.addIssue({ code: "custom", path: ["is_living"], message: "a person with death_year must have is_living: false" });
    }
    if (p.is_minor === true && p.is_living === false) {
      ctx.addIssue({ code: "custom", path: ["is_minor"], message: "is_minor applies only to living people" });
    }
  });

export type Person = z.output<typeof personSchema>;
