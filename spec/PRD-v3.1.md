# Khowar Lyrics Archive — Implementation Specification (PRD v3.1)

Status: supersedes PRD 1, PRD 2 and PRD v3 for all implementation purposes. Market research is not repeated here; v3 remains the reference for evidence and citations.
Date: 2026-10-10. Audience: one developer working with Claude Code.

---

## 0. Read this first

Three facts constrain everything below:

1. **Technical work no longer waits for validation.** Interviews, request counts, endorsement and budget are now parallel activities (§11). Phase 1 can start today.
2. **Content work still waits for two things that are not "validation":** a person who can read Khowar to review text (D-12), and documented rights for every lyric shown to the public (§6). Phase 2 cannot exit without both. That is a content prerequisite, not a market gate.
3. **The only SQL in this spec is in `spec/sql/future_schema.sql`**, and it is executed by `spec/sql/future_schema_test.sql`. Both pass on PostgreSQL 16.15 under `C.UTF-8` and `C` ctype (run 2026-10-10). No SQL appears inline in this document, so nothing here can drift from the tested file.

Every open product choice is listed in §15 with an ID (`D-nn`). Where the spec needs a value to proceed, it uses a **provisional default** and names the decision that can overturn it. Nothing is silently chosen.

---

## 1. What changed from v3

| Area | v3 | v3.1 |
|---|---|---|
| Gates before coding | 20 interviews, 25 requests, endorsement, co-editor, PKR budget | None. Validation runs in parallel (§11). |
| Phase 1 | 5-song editorial pilot | Technical proof of concept, 3 synthetic or authorized songs (§3) |
| Phase 2 / 3 | 10 songs at public beta | 5 reviewed + cleared songs (private preview), then ~10 for public beta |
| Rights L0–L5 | Read as a legal ladder | Renamed **E0–E5 internal evidence grades**. Permission-first. Not a legal classification (§6). |
| Female performers | Hidden by default | Removed. One consent, privacy and safety policy for everyone (§7). |
| Interactivity | Framer Motion excluded | React + Motion islands allowed on homepage, navigation, discovery. Lyric reading path stays zero-JS (§4). |
| DB migration | Triggered at >150 songs | Triggered by editorial workflow needs, not counts (§10). |
| SQL | Contained invalid syntax | Invalid statements removed; remaining SQL tested (§10). |

SQL defects removed from v3:
- `primary key (..., coalesce(person_id, 0))` — expressions are not allowed in a primary key. Replaced by `unique nulls not distinct (song_id, role, person_id)` (PG ≥ 15).
- `khw_skeleton` `translate()` strings were misaligned (39 "from" characters vs 31 "to"), mapping letters to the wrong consonants. Rewritten with 31/31 and covered by tests.
- `extensions.gin_trgm_ops` assumed a Supabase-specific schema. Now unqualified; schema placement is a deployment detail.
- Raw-script trigram indexes. Verified: under `C` ctype PostgreSQL extracts no trigrams from Arabic script. Trigram indexes now apply only to the ASCII skeleton and Roman folds.

---

## 2. Scope (unchanged features, restated for build)

**In scope (public site):**
- Home: purpose line, search entry, featured songs.
- Song page: Khowar lines with per-line Roman and English layers, credits (per §7), provenance, rights line, link-out to recordings, takedown link.
- Song list (`/songs/`): all publishable songs, sorted.
- Search (`/search/`): title, alias, credit name, partial lyric (Khowar, Roman, English).
- Static pages: About/Method, Rights & Takedown, Credits.
- Submissions: link to an external form (D-08). No server-side intake.

**Out of scope:** accounts, comments, audio hosting or embeds, user-side editing, Urdu UI (D-10), artist/poet/collection pages, Kalasha material, machine-translated text in public view.

**Product principles that govern build decisions:**
1. Lyrics must be readable with JavaScript disabled and before the webfont loads.
2. Nothing is public unless the build-time publishability check passes (§6).
3. Khowar text is canonical; Roman and English are line-aligned layers beneath each line.

---

## 3. Phases and exit criteria

### Phase 1 — Technical proof of concept (3 sample songs)

Purpose: prove the four hard technical claims before any real content is handled.

Sample content: 3 songs that are either
- **synthetic** — text written for testing by the developer or a collaborator, marked `synthetic: true`, never publishable; or
- **authorized** — real text with written permission covering test use (D-15).

The 3 samples together must contain:
- every Khowar-specific letter (ݮ ݯ ݰ ݱ ځ څ) in isolated, initial, medial and final position;
- at least one Urdu line inside a Khowar song (per-line `lang`);
- at least one Latin name or number embedded in an RTL line;
- one line long enough to wrap at 360 px;
- one stanza with Roman but no English, to exercise missing-layer handling.

**Exit criteria (all required):**

| # | Claim | Evidence |
|---|---|---|
| P1-1 | Khowar letters render correctly | Font coverage report + screenshot matrix (§8) reviewed by a Khowar reader; result recorded as D-03 |
| P1-2 | RTL/LTR display is correct | Playwright e2e: `dir`/`lang` attributes per line; Latin runs isolated; no horizontal scroll at 360/390/430 px |
| P1-3 | Translations are line-aligned | e2e: each Khowar line is immediately followed by its own Roman/English nodes; toggles work with JS disabled |
| P1-4 | Partial-lyric search works | Unit tests on folding vectors + e2e: 12 scripted queries (Khowar, Urdu-keyboard substitutes, Roman, English fragments) return the expected song in top 3 |
| P1-5 | Synthetic content cannot ship | Production build fails if any `synthetic: true` song would be emitted |

Phase 1 runs locally and on an unlisted preview only. No public deploy.

### Phase 2 — Five reviewed, rights-cleared songs (private preview)

Entry: Phase 1 exit criteria met; a Khowar reviewer and second reader identified (D-12).

**Exit criteria:**
- 5 songs with `review.second_reader` and `review.verified_on` set.
- All 5 publishable under §6 (expected route: E4/E5 written permission).
- Every credited person's visibility has a recorded basis (§7).
- Rights & Takedown page and Credits page complete.
- Performance budget met on throttled profile (§4).
- Deployed to a password-protected or `noindex` preview (D-02).

### Phase 3 — Public beta (~10 songs)

**Exit criteria:**
- ~10 publishable songs (target, not a hard gate; launch with fewer if the remaining songs are blocked only on permission timing).
- Takedown channel live and monitored; DMCA designated agent registered if the host is US-based and user submissions are accepted (D-18).
- OG share images render Khowar correctly (pre-rendered; §12 T-31).
- Sitemap and `robots.txt` exclude synthetic and non-publishable pages.
- Analytics decision made (D-09), including "none".
- Answers to the §6 legal questions that affect any published song are on file.

---

## 4. Architecture

**Framework:** Astro (static output), TypeScript, content collections validated with Zod.
**Islands:** React + Motion (`motion` package, `motion/react`; formerly Framer Motion), hydrated only where listed below. Use the installed UI/UX Pro Max skill for visual system decisions and the Framer Motion skill for island animation.

| Surface | Rendering | Islands allowed | Motion use |
|---|---|---|---|
| Home `/` | Static | `HomeFeatured` (client:visible), `SiteNav` (client:idle) | Card entrance, search-entry focus transition |
| Navigation (all pages) | Static markup works without JS | `SiteNav` mobile drawer | Drawer open/close |
| Search `/search/` | Static shell | `SearchPanel` (client:load) | Result list enter/exit |
| Song list `/songs/` | Static | `SiteNav` only | None |
| Song page `/songs/[slug]/` | Static, zero-JS lyric block | `SiteNav` only, provisional (D-06) | None in or around lyrics |

**Rules for islands:**
- Use `LazyMotion` with `domAnimation` and the `m` component to keep the bundle small.
- Wrap islands in `MotionConfig reducedMotion="user"`; every animation must have a reduced-motion equivalent (opacity-only or none).
- No animation may delay, move or reflow lyric text.
- Every island must have a usable no-JS fallback (nav links visible; search page shows a plain form that links to `/songs/`).

**Layer toggles on song pages:** CSS-only (radio inputs + `:has()`), no hydration. Fallback where `:has()` is unsupported: all layers shown.

**Performance budget** (measured in CI with Lighthouse, "Slow 4G", mobile emulation):

| Item | Budget |
|---|---|
| Song page HTML + inline CSS (gzip) | ≤ 35 KB |
| Song page JS before lyrics are readable | 0 KB |
| Song page JS total (nav island) | ≤ 70 KB gzip, loaded `client:idle` (D-06 may set to 0) |
| Home / search JS total | ≤ 90 KB gzip |
| Khowar font (single site-wide subset, woff2) | Target ≤ 120 KB; actual measured in Phase 1 |
| LCP / CLS / INP | < 2.5 s / < 0.1 / < 200 ms |

The 120 KB font target is an estimate [Guessing]; Nastaliq fonts vary widely. Phase 1 records the real size, and the budget is updated then.

**Hosting:** static files on any CDN host (D-02). No server runtime is required in Phases 1–3.

---

## 5. Content model (static phase)

One YAML file per song in `src/content/songs/`, one per person in `src/content/people/`. Validated at build; any violation fails the build.

### Song fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `schema_version` | int | yes | `1` |
| `slug` | string | yes | kebab-case, unique |
| `status` | `draft \| in_review \| published \| withdrawn` | yes | Editorial intent; publication still requires §6 check |
| `synthetic` | bool | yes | `true` for Phase 1 test songs |
| `titles.khw_arab`, `titles.roman_popular` | string | yes | |
| `titles.roman_editorial`, `titles.en` | string | no | |
| `aliases` | string[] | no | Alternate spellings, indexed for search |
| `genre` | string[] | no | Controlled list in `src/content/vocab.ts` (D-16b) |
| `credits[]` | `{role, person, visibility, visibility_basis, recorded_on}` or `{role, traditional: true}` | yes | `visibility_basis`: `own_choice \| family_choice \| official_release_credit \| default_withheld`. Rules in §7 |
| `rights.lyric`, `rights.transliteration`, `rights.translation_en` | evidence record (below) | lyric yes | |
| `provenance[]` | `{source_id, type, note}` | yes (non-synthetic) | |
| `recordings[]` | `{platform, url, official}` | no | Link-out only |
| `review` | `{transcribed_by, second_reader, verified_on}` | yes for publish | |
| `stanzas[].lines[]` | `{id, lang, script, text, renderings{roman_popular?, roman_editorial?, en?}}` | yes | Per-line language; renderings keyed to the line |
| `changelog[]` | `{date, by, note}` | yes | Git history is the full audit trail |

### Evidence record

`{ grade: E0..E5, evidence_ids: string[], license?: string, legal_advice_confirmed: bool, revoked_on?: date }`

Evidence documents (signed forms, CNIC copies, correspondence) **never enter the site repository**. `evidence_ids` point to a private store (D-13b).

### Person fields

`slug`, `display_name`, `name_khw_arab?`, `is_living?`, `death_year?`. No contact details, photos or location fields exist in the schema.

### Example (synthetic, abbreviated)

```yaml
schema_version: 1
slug: test-song-01
status: draft
synthetic: true
titles: { khw_arab: "[TEST TITLE]", roman_popular: "Test Song 01" }
credits:
  - { role: lyricist, traditional: true }   # no person; always displayed as "Traditional"
rights:
  lyric: { grade: E0, evidence_ids: [], legal_advice_confirmed: false }
stanzas:
  - n: 1
    lines:
      - id: l1
        lang: khw
        script: Arab
        text: "[synthetic line containing ݮ ݯ ݰ ݱ ځ څ]"
        renderings: { roman_popular: "[roman]", en: "[english]" }
      - id: l2
        lang: ur
        script: Arab
        text: "[synthetic Urdu line]"
        renderings: { roman_popular: "[roman]" }
changelog: [ { date: 2026-10-10, by: dev, note: "Phase 1 fixture" } ]
```

---

## 6. Rights: internal evidence grades

**Status of this framework:** E0–E5 are an internal method for recording how much evidence the project holds. They are **not** legal categories, do not establish public-domain status, and do not replace legal advice. Public pages never show grade codes; they show a plain rights line ("Published with permission of …", "Traditional song; sources: …").

| Grade | Meaning (evidence held) | Publishable? |
|---|---|---|
| E0 | Nothing documented | No |
| E1 | One source describes the song as traditional | No |
| E2 | ≥ 2 independent sources describe it as orally transmitted with no known author; no claimant found after asking | Only if `legal_advice_confirmed` for this category |
| E3 | Author identified; death year documented by ≥ 2 sources | Only if `legal_advice_confirmed` for this author/term analysis |
| E4 | Written permission from the author | **Yes** |
| E5 | Written permission from all known heirs, or one heir with written authorization from the others | **Yes** |

**Priority:** documented permission (E4/E5) is the default route for every song in Phases 2–3. E2/E3 exist so evidence is recorded, but they unlock publication only after a lawyer confirms the basis.

**Layers are independent.** A Roman transliteration or English translation needs its own record (contributor agreement or staff work). Third-party transcriptions or translations are never copied; they may be cited as sources.

**Revocation:** a revoked record stops counting immediately; the next build removes the lyric text.

**Build-time rule** (implemented in `src/lib/rights/publishability.ts`, mirrors the SQL view `song_publishability`; both must pass the same test cases):

```
publishable(song) =
  !song.synthetic
  && song.status == "published"
  && lyricLayerPublishable(song.rights.lyric)        // E4/E5 unrevoked, or E2/E3 with legal_advice_confirmed
  && every displayed rendering layer has its own publishable record
  && song.review.second_reader is set
```

Non-publishable songs generate no page, no search entry, no sitemap entry.

### Questions requiring legal advice (Pakistani IP lawyer; US counsel if hosting in the US)

Each answer is recorded in the private store with date and adviser. Until answered, the dependent route stays closed.

| # | Question | Closes / opens |
|---|---|---|
| L-1 | Can an orally transmitted song of unknown authorship be transcribed and published? Does any right attach to the performer or first publisher? | E2 route |
| L-2 | What term applies to unpublished works of unknown authorship under the Copyright Ordinance 1962 (the s.21 / s.23 interaction)? | E2 route |
| L-3 | For a US-hosted site, which Pakistani works that are out of term in Pakistan may still be protected in the US (URAA restoration)? | E3 route |
| L-4 | Is permission valid when given by WhatsApp message or voice note, or must it be signed on paper? | E4/E5 evidence form |
| L-5 | What formalities apply to heirs' consent (succession certificate, all heirs, one heir with authorization)? | E5 |
| L-6 | Does the project, as an editorial publisher, have any DMCA safe-harbor protection for its own pages, or only for user submissions? | Hosting and takedown policy |
| L-7 | Is a translation commissioned from a contributor in Pakistan owned by the contributor unless assigned in writing? | Translation contributor agreement |
| L-8 | What obligations apply to storing CNIC copies and submitter contact data? | Private store design (D-13b) |
| L-9 | Final wording of the permission form and contributor agreement | D-13 |

---

## 7. Credits: consent, privacy and safety policy

Applies identically to every credited person, regardless of gender or role.

1. **A living adult's own choice governs** how they are credited: `public`, `initials` or `withheld`. The choice is recorded with a date (`visibility_basis: own_choice`).
2. **Without a recorded choice**, a living person's name is shown only as it already appears in the credits of their own official public release (`official_release_credit`). Otherwise the credit is `withheld` (`default_withheld`).
3. **Deceased persons:** the family's recorded choice if given (`family_choice`); otherwise as credited in published sources.
4. **Changes on request, no justification required:** any credited person, or the family of a deceased person, may change visibility at any time. Honored within 72 hours; within 24 hours when the request mentions safety or harassment.
5. **Minimum data:** the site never publishes contact details, photographs, home village or family relationships of credited people. The schema has no fields for them.
6. **Under-18s:** no named credit without a parent's or guardian's recorded consent.
7. **Traditional credits** have no person attached and are always shown as "Traditional"; visibility fields do not apply to them.
8. **Enforcement:** the content schema rejects `visibility: public` or `initials` when `visibility_basis` is `default_withheld` (mirrored by a CHECK constraint in the future SQL, tested).

---

## 8. Typography and bidirectional text

**Candidates for Phase 1 test (D-03):** Noto Nastaliq Urdu (OFL), Gulzar (OFL), Noto Naskh Arabic (OFL, fallback). Awami Nastaliq is used only as a Firefox reference: it is Graphite-only. [Certain per SIL's own statement, cited in v3]

**Coverage of U+0770 and U+0771 in any web Nastaliq font is unverified.** Phase 1 produces the answer.

**Phase 1 font procedure (scripts in `scripts/fonts/`, dev-only):**
1. Coverage: fontTools reads each candidate's cmap and reports missing code points from the required list (all Khowar-specific letters plus Urdu letters used in fixtures).
2. Shaping: `hb-shape` runs each Khowar letter in isolated/initial/medial/final contexts (ZWJ and real neighbours) and fails on any `.notdef`/gid 0.
3. Subset with all layout features retained (`pyftsubset --layout-features='*'`), then re-run step 2 on the subset (known HarfBuzz subsetting bug with Noto Nastaliq 3.0).
4. Device matrix: `tests/fonts/font-test.html` on Chrome Android, Samsung Internet, iOS Safari and Firefox Android. The Khowar reader marks each letter/form/font cell; screenshots stored in `tests/fonts/results/<date>/`.
5. Decision D-03: first Nastaliq candidate passing every cell; if none passes, Naskh is the canonical display.

**CSS rules:**
- One font per Arabic-script run. `unicode-range` separates Arabic from Latin only, never splits Arabic letters across fonts (that breaks joining).
- Fixed unitless `line-height` ≥ 2.2 for Nastaliq (final value from Phase 1 overlap test), identical for the fallback so swap does not change line box height.
- Metric-matched fallback via `size-adjust` / `ascent-override` / `descent-override`, values tuned in Phase 1.
- `font-display: swap` provisional; `optional` only if the Khowar reader accepts Naskh as first-visit reading font (D-03).
- Self-hosted, versioned filename, long-lived cache, preloaded on song pages only.

**Markup rules:**
- Each line is a block element with its own `lang` and `dir`: `lang="khw"` + `dir="rtl"` for Khowar; `lang="ur"` + `dir="rtl"` for Urdu; `lang="khw-Latn"` + `dir="ltr"` for Roman; `lang="en"` + `dir="ltr"` for English.
- Latin names or numbers inside RTL text and Khowar names inside English UI are wrapped in `<bdi>`.
- Search input and any free-text field use `dir="auto"`.
- `'khw'` is the ISO 639-3 code and almost certainly valid in BCP 47 [Likely; confirm against the IANA registry in T-01]. Screen readers have no Khowar voice; each Khowar line keeps its Roman and English layers in the accessibility tree.

---

## 9. Search specification

**Engine:** MiniSearch, index built at build time from publishable songs only, loaded by the `SearchPanel` island. Chosen because it accepts pre-folded fields without imposing Arabic stemming. [Likely] Revisit only if the index exceeds the JS budget.

**Indexed fields per song:** `title_loose`, `alias_loose`, `alias_roman`, `credit_names` (visible credits only), `lines_loose`, `lines_skel`, `roman_fold`, `roman_skel`, `en_text`.

**Normalization pipeline** (single module `src/lib/search/normalize.ts`, used at build and query time):
1. NFKC.
2. Remove ignorables: tatweel, harakat (U+064B–065F), U+0670, Quranic marks (U+06D6–06ED), ZWNJ/ZWJ, LRM/RLM, bidi embeddings and isolates, BOM.
3. **Strict fold:** ي ى → ی; ك ڪ → ک; ه ە ۂ ة → ہ; آ أ إ ٱ → ا; ؤ → و; Arabic-Indic and extended digits → ASCII; ، ؛ ؟ ۔ → space; collapse whitespace.
4. **Loose fold:** ے ۓ ئ → ی; ھ → ہ; ݮ → ج; ݯ → چ; ݰ → ش; ݱ → ژ; څ → چ; ځ → ز; ں → ن; ء removed.
5. **Skeleton:** consonants to ASCII (`ب→b … ن→n`, full table in `future_schema.sql`); vowel carriers dropped; lowercase Latin passes through.

**Roman fold:** lowercase; š/ṣ→sh, č/c̣→ch, ž/ẓ→zh, ġ→gh, ʰ→h; strip diacritics; q→k; kh→x, gh→g, sh→q (internal symbol), zh→z, ch/ts→c, dz→j; aspirate digraphs (th, dh, ph, bh, jh) lose h; v→w; collapse doubled letters. Roman skeleton additionally drops vowels.

**Test vectors** live in `tests/fixtures/folding-vectors.json`. The TypeScript unit tests and `spec/sql/future_schema_test.sql` must use the same vectors (T-10 includes a parity check).

**Known limitations (decisions, not bugs):**
- Mappings for څ and ځ are phonetic guesses [Guessing]; to be checked with native typists (D-05b).
- "kh" in Roman folds to x (خ), but the Nastaliq aspirate کھ skeletonizes to "kh". Aspirated words may need aliases (D-05c).

**Query behaviour:** Arabic-script input queries loose + skeleton fields; Latin input queries roman + skeleton + English fields. Prefix matching on; fuzzy 0.2 on Roman and skeleton fields only. Zero-result state links to `/songs/` and the submission form.

---

## 10. Future PostgreSQL migration

**Stays static while** one or two editors work through Git, publishing is a build, and submissions arrive through an external form.

**Migrate when one or more of these is true in practice** (judged by the developer; record the reason in the decision log):
- Non-technical editors need to edit content and Git (or a Git-based CMS) has demonstrably blocked them.
- Review needs concurrent per-user states, assignment or approvals that Git branches cannot represent cleanly.
- Submissions need to be triaged inside the product rather than in an external form.
- Rights or takedown changes must take effect without a rebuild.
- Content relationships (versions, cross-song credits) have outgrown file-based validation.

**Schema:** `spec/sql/future_schema.sql`. **Tests:** `spec/sql/future_schema_test.sql`, which asserts:
- folding vectors (strict, loose, skeleton);
- trigrams exist for skeletons under any ctype;
- multiple versions per song, and a canonical pointer to another song's version is rejected;
- per-line language with matching generated keys;
- one rendering per line/kind/language;
- one traditional credit per role; public credits require a recorded basis;
- publishability derived from evidence, including revocation and the legal-confirmation rule.

Run: `psql -v ON_ERROR_STOP=1 -f future_schema.sql -f future_schema_test.sql` on an empty PostgreSQL ≥ 15 database. Last result: **ALL TESTS PASSED** on PostgreSQL 16.15 (`C.UTF-8` and `C`).

Known unknowns for later: hosting provider pricing and its database ctype; whether to run NFKC in the database (`normalize()`) or keep it in the application (current spec: application).

---

## 11. Validation activities and planning estimates (non-blocking)

Run in parallel with development. Results inform D-decisions and the decision to open Phase 3 publicly; none blocks a coding task.

| Activity | Informs | Suggested size |
|---|---|---|
| Listener interviews (script in v3 §D.1) | D-04, D-10, search aliases | 10–20 conversations |
| Lyric-card posts in community channels | Whether to launch Phase 3 publicly or stay private | 3 posts |
| Song request form | Phase 2/3 song selection | Open-ended |
| Outreach to poets, families, khowari.com, Bashonu, ATK (templates in v3 §D.3) | Phase 2 permissions | Ongoing |
| Cultural advisor / endorsement | Trust at public launch | Optional |
| Native-typist test (20 words dictated) | D-05b, D-05c | 5–10 typists |

**Planning estimates** [Guessing]: reviewer/translator costs of roughly PKR 6,000–10,000 per fully produced song; 1–2 hours of developer data entry per song once text and permissions exist. Replace with measured figures from Phase 2.

---

## 12. Development backlog

Legend: **Dep** = must finish first. Every task's tests are part of its definition of done.

### Phase 1 — Proof of concept

| ID | Task | Dep | Acceptance criteria | Tests |
|---|---|---|---|---|
| T-01 | Scaffold Astro + TS strict + React integration + `motion`; add Vitest, Playwright, axe, Lighthouse CI; write `CLAUDE.md` | — | `npm run build`, `test`, `e2e` run green on empty site; CLAUDE.md states §0 rules | CI workflow runs all three |
| T-02 | Content schemas (song, person, vocab) with Zod | T-01 | Invalid fixtures fail the build with field-level messages | Unit: 1 valid + ≥ 8 invalid fixtures (missing line lang, public credit with default basis, missing rendering keys, etc.) |
| T-03 | `publishability.ts` + build filter | T-02 | Rule in §6 implemented; synthetic songs render only in dev/preview with `noindex` | Unit: same 6 cases as SQL test §6; build test: production build with a synthetic `published` song exits non-zero (P1-5) |
| T-04 | `credits/visibility.ts` | T-02 | Rendering obeys §7 rules 1–3 and 6 | Unit: one case per rule |
| T-05 | Write 3 sample songs meeting the §3 coverage list | T-02 | Coverage list satisfied; marked `synthetic` or carry authorization record | Unit: fixture-coverage test asserts each required letter/position, Urdu line, Latin-in-RTL, wrap line, missing-layer stanza |
| T-06 | Font tooling: coverage + shaping + subset scripts | — | Report lists missing code points and `.notdef` hits per candidate | Script exits non-zero on any missing required glyph |
| T-07 | `font-test.html` device matrix page | T-06 | Renders every Khowar letter × form × candidate font; overlap test at 3 line-heights | Manual: device matrix recorded in `tests/fonts/results/` |
| T-08 | Base layout, tokens, `khowar.css` (using UI/UX Pro Max skill) | T-01, T-06 | Line-height, fallback metrics, `@font-face` per §8; no Arabic split across fonts | e2e screenshot at 360/390/430 px; axe: 0 serious violations |
| T-09 | Song page: line-aligned layers, CSS-only toggles, `lang`/`dir`/`bdi` | T-03, T-04, T-08 | P1-2 and P1-3 pass; readable with JS disabled | e2e: attribute assertions per line; JS-disabled run; no horizontal scroll |
| T-10 | `normalize.ts` + `folding-vectors.json` | T-01 | Pipeline per §9 | Unit: all vectors; SQL-vector parity check script |
| T-11 | Search index build + `SearchPanel` island (Motion, reduced-motion) | T-03, T-10 | Only publishable (or dev synthetic) songs indexed; P1-4 queries pass | Unit: index excludes non-publishable; e2e: 12 scripted queries top-3 |
| T-12 | Phase 1 review | T-07, T-09, T-11 | P1-1…P1-5 evidenced; D-03 recorded | Checklist in `docs/phase-reports/phase-1.md` |

### Phase 2 — Five reviewed, cleared songs

| ID | Task | Dep | Acceptance criteria | Tests |
|---|---|---|---|---|
| T-20 | Apply D-03 font decision; tune fallback metrics | T-12 | CLS < 0.1 on throttled first visit | Lighthouse CI on song page |
| T-21 | Home page + `HomeFeatured` island + `SiteNav` island (Motion skill) | T-08 | Budgets in §4; no-JS fallback works | e2e no-JS; Lighthouse JS budget assertion; reduced-motion e2e |
| T-22 | Song list page | T-03 | Lists publishable songs only | Unit/e2e: count equals publishable set |
| T-23 | Rights & Takedown, Credits, About pages | T-04 | §6 public rights lines and §7 request path described; Urdu + English takedown text | e2e: links reachable from every song page footer |
| T-24 | Enter 5 real songs | T-20, D-12, D-13 | All publishable under §6; review fields set | Build passes; publishability unit snapshot lists exactly 5 |
| T-25 | Preview deploy (D-02), `noindex` | T-24 | Not discoverable by crawlers | e2e: `X-Robots-Tag`/meta present |
| T-26 | Performance pass | T-21–T-25 | All §4 budgets met | Lighthouse CI assertions fail the build if exceeded |

### Phase 3 — Public beta (~10 songs)

| ID | Task | Dep | Acceptance criteria | Tests |
|---|---|---|---|---|
| T-30 | Enter remaining songs to ~10 | T-24 | Same as T-24 | Same |
| T-31 | Pre-rendered OG images (Playwright at build, real font) | T-20 | Khowar renders correctly in card images | Visual review by Khowar reader; build test that every published song has an image |
| T-32 | SEO: titles, canonical, JSON-LD (`MusicComposition`), sitemap, robots | T-30 | No synthetic/non-publishable URLs in sitemap | Unit on sitemap generator |
| T-33 | Submission link (D-08) and takedown channel live | T-23 | Channels tested end-to-end | Manual test log |
| T-34 | Analytics per D-09 (or none) | T-21 | No cookies; lyric page stays JS-free | e2e: no analytics script on song page if pixel-based |
| T-35 | Public deploy | T-26, T-30–T-34, legal answers on file | Phase 3 exit criteria in §3 | Release checklist in `docs/phase-reports/phase-3.md` |

---

## 13. Folder structure

```text
khowar-lyrics/
├── CLAUDE.md                     # rules for Claude Code (from §0, §2 principles, §14)
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── fonts/                    # generated subsets, versioned filenames
├── src/
│   ├── content.config.ts         # Zod schemas for songs, people
│   ├── content/
│   │   ├── songs/*.yaml
│   │   ├── people/*.yaml
│   │   └── vocab.ts              # genre list, credit roles
│   ├── lib/
│   │   ├── rights/publishability.ts
│   │   ├── credits/visibility.ts
│   │   └── search/
│   │       ├── normalize.ts
│   │       └── build-index.ts
│   ├── components/
│   │   ├── layout/               # BaseLayout, Footer (static)
│   │   ├── lyrics/               # LyricBlock, Line, LayerToggle (static, zero JS)
│   │   └── islands/              # React + Motion: SiteNav, HomeFeatured, SearchPanel
│   ├── pages/
│   │   ├── index.astro
│   │   ├── songs/index.astro
│   │   ├── songs/[slug].astro
│   │   ├── search.astro
│   │   ├── about.astro
│   │   ├── rights.astro          # rights + takedown
│   │   ├── credits.astro
│   │   └── 404.astro
│   └── styles/
│       ├── tokens.css
│       └── khowar.css
├── scripts/
│   ├── fonts/                    # coverage, shaping, subset (dev-only)
│   └── og/                       # Phase 3
├── tests/
│   ├── unit/
│   ├── e2e/
│   ├── fixtures/
│   │   ├── folding-vectors.json
│   │   └── invalid-songs/
│   └── fonts/
│       ├── font-test.html
│       └── results/
├── docs/
│   ├── decisions.md              # D-nn log with date and rationale
│   └── phase-reports/
└── spec/
    ├── PRD-v3.1.md
    └── sql/
        ├── future_schema.sql
        └── future_schema_test.sql
```

Rights evidence, signed forms and legal notes live **outside** this repository (D-13b).

---

## 14. Implementation sequence for Claude Code

Run one step per session. Each step ends with tests green and a commit. Do not start a step until its dependencies are committed.

| Step | Tasks | Instruction to give Claude Code | Done when |
|---|---|---|---|
| 1 | T-01 | "Scaffold per spec §13 and §4; write CLAUDE.md from §0, §2, §14. No pages yet." | CI green on empty site |
| 2 | T-02, T-04 | "Implement content schemas and credit visibility per §5 and §7 with the listed tests." | Invalid fixtures fail as specified |
| 3 | T-03 | "Implement publishability per §6, mirroring the SQL view test cases." | P1-5 build test fails correctly |
| 4 | T-06, T-07 | "Build font tooling and the device test page per §8." | Coverage report produced for all candidates |
| 5 | T-05 | "Create 3 synthetic fixtures meeting §3 coverage list." (Khowar text supplied or checked by a Khowar reader where possible) | Coverage test green |
| 6 | T-08, T-09 | "Build layout and song page per §8; use the UI/UX Pro Max skill for the visual system; no JS on the lyric path." | P1-2, P1-3 e2e green |
| 7 | T-10, T-11 | "Implement normalization and search per §9; SearchPanel island uses the Framer Motion skill with reduced-motion support." | P1-4 green |
| 8 | T-12 | "Compile the Phase 1 report." | Developer records D-03 |
| 9+ | Phase 2, Phase 3 tasks in table order | One task group per session | Phase exit criteria met |

**Standing instructions for every session (put in CLAUDE.md):**
- Never add features not listed in §2.
- Never place lyric text, evidence documents or personal data in fixtures unless synthetic or authorized.
- Never import React or Motion into `components/lyrics/`.
- Any change to normalization must update `folding-vectors.json` and keep SQL parity.
- If a task needs an unresolved D-decision, stop and ask; do not choose.

---

## 15. Unresolved decisions

| ID | Decision | Needed by | Provisional default (if any) |
|---|---|---|---|
| D-01 | Product name and domain | Phase 3 | Working name "Khowar Lyrics Archive" |
| D-02 | Hosting provider and preview protection method | Phase 2 | None; Phase 1 is local |
| D-03 | Canonical Khowar font, line-height, `swap` vs `optional`, Naskh acceptance | End of Phase 1 | Decided by test results |
| D-04 | Default visible layers on song page (Khowar only / + Roman / + English) | Phase 2 | Khowar + Roman |
| D-05 | Editorial Roman standard (exact diacritics) | Phase 2 | Bashir-aligned, per v3 table |
| D-05b | Fold targets for څ and ځ | Phase 3 | As in §9 |
| D-05c | Handling of aspirates (کھ) vs خ in Roman search | Phase 3 | Aliases per song |
| D-06 | Whether song pages load the nav island or a CSS-only nav | Phase 2 | Nav island, `client:idle` |
| D-08 | Submission channel (Tally, Google Forms, email, WhatsApp) | Phase 3 | None |
| D-09 | Analytics provider, or none | Phase 3 | None |
| D-10 | UI language for beta (English only vs English + Urdu) | Phase 3 | English only |
| D-12 | Who is the Khowar reviewer and second reader | Phase 2 entry | None — blocks Phase 2 exit |
| D-13 | Final permission form and contributor agreement wording | Phase 2 | v3 §D.2 outlines, pending L-9 |
| D-13b | Private evidence store (location, encryption, access) | Phase 2 | None |
| D-14 | Whether to pursue E2/E3 routes at all | After L-1–L-3 | Permission-only (E4/E5) |
| D-15 | Phase 1 samples: synthetic or authorized; who writes synthetic Khowar text | Phase 1 step 5 | Synthetic |
| D-16 | Whether copy/share of lyric text is allowed per song under each license | Phase 2 | Native text selection only; no share-image of lyrics unless license allows |
| D-16b | Genre vocabulary | Phase 2 | Short list from v2 genres |
| D-17 | Visual identity (palette, type scale, wordmark) | Phase 2 | Set with UI/UX Pro Max skill, reviewed by developer |
| D-18 | Operator legal name and jurisdiction; DMCA agent registration | Phase 3 | None |
| D-19 | Whether to migrate to PostgreSQL | When §10 conditions arise | Stay static |

---

## 16. Risks that affect implementation

| Risk | Effect | Mitigation in this spec |
|---|---|---|
| No web Nastaliq font passes Khowar letters on all devices | Display falls back | D-03 allows Naskh canonical; decided in Phase 1, before real content |
| No Khowar reviewer found | Phase 2 cannot exit | Phase 1 proceeds; D-12 surfaced early |
| Permissions take months | Fewer beta songs | Phase 3 target is ~10, not a hard count |
| Motion islands bloat pages | Slow loads on weak networks | JS budgets enforced in CI; lyric path zero-JS |
| Folding errors (څ, ځ, aspirates) | Missed search results | Shared vectors; D-05b/c; native-typist test |
