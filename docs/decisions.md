# Decision log

IDs follow PRD v3.1 §15. "Confirmed" decisions are final until revisited here with a new dated entry. "Open" decisions are not decided: a provisional default only lets work proceed and may be overturned. If a task needs an open decision, stop and ask the owner.

## Confirmed

| ID | Decision | Date | Reason / source |
|---|---|---|---|
| D-04 | Default reading mode is original Khowar + popular Roman Khowar. English is available but not shown by default. | 2026-10-10 | Owner (Prompt 2). Matches the PRD provisional default. |
| D-06 | Song pages use CSS-only navigation, no `SiteNav` island. React and Motion are allowed only on home and search. Song-page JS budget is therefore 0 KB total, replacing the PRD's provisional ≤ 70 KB nav island. | 2026-10-10 | Owner (Prompt 2). Keeps the lyric path fully JS-free on slow mobile networks. |
| D-12 | The owner is the primary Khowar-language editor (fluent reader and writer). One independent fluent Khowar reviewer (second reader) is required before any real lyrics are published. Not required for the synthetic prototype. | 2026-10-10 | Owner (Prompts 1–2). The reviewer's identity still needs recording before Phase 2 exit. |
| D-15 | Phase 1 uses three synthetic sample songs (`synthetic: true`, never publishable). | 2026-10-10 | Owner (Prompt 2). Matches the PRD default. Assumed: the owner writes or checks the synthetic Khowar text. |
| D-17 | The visual system (palette, type scale, wordmark) is established with the `ui-ux-pro-max` and `frontend-design` skills during T-08, then reviewed by the owner. | 2026-10-10 | Owner (Prompt 2). Final palette/type values will be recorded here after T-08. |
| — | Tailwind CSS is part of the approved stack (v4, via `@tailwindcss/vite`). | 2026-10-10 | Owner (Prompts 1 and 3). Not mentioned in PRD v3.1; adopted as an owner decision. |
| — | E0–E5 are internal evidence records, not automatic legal permission. | 2026-10-10 | Owner (Prompt 2); PRD §6. |
| — | `khw` is a valid BCP 47 primary language subtag ("Khowar", added 2009-07-29). | 2026-10-10 | Verified against the IANA Language Subtag Registry (File-Date 2026-09-17) during T-01, as PRD §8 requires. |
| — | **Temporary `is_minor` person field approved.** Age verification and guardian-consent support are incomplete. The future model must distinguish minor, adult and unknown status. Until consent verification exists, known minors are never publicly identified (always withheld). | 2026-10-10 | Owner. Needed to enforce PRD §7 rule 6. |
| D-16b | **Provisional genre vocabulary:** `folk`, `traditional`, `ghazal`, `dialogue-song`, `wedding-song`, `elegy`, `devotional`, `contemporary`, `childrens-song`. Provisional classifications the primary Khowar editor may refine. | 2026-10-10 | Owner. Replaces the PRD default that referred to PRD v2. Implemented in `src/content/vocab.ts`. |
| — | `yaml` (2.9.1, the version Astro uses) approved as a development dependency. | 2026-10-10 | Owner. Used by tests and by the build-time credit-reference check. |
| — | Credit-to-person reference validation must run at build time no later than T-09. | 2026-10-10 | Owner. Implemented in T-03: every song's credits are checked against `src/content/people/` during content sync, so any build fails on an unknown person or inconsistent basis. |

## Open

| ID | Decision | Needed by | Provisional default | Notes |
|---|---|---|---|---|
| D-01 | Product name and domain | Phase 3 | Working name "Khowar Lyrics Archive" | |
| D-02 | Hosting provider and preview protection method | Phase 2 | None; Phase 1 is local | `deploy-to-vercel` is used only if Vercel is chosen. |
| D-03 | Canonical Khowar font, line-height, `swap` vs `optional`, Naskh acceptance | End of Phase 1 | Decided by T-06/T-07 test results | Candidates: Noto Nastaliq Urdu, Gulzar, Noto Naskh Arabic. |
| D-05 | Editorial Roman standard (exact diacritics) | Phase 2 | Bashir-aligned, per PRD v3 table | PRD v3 is not in this repository. |
| D-05b | Fold targets for څ and ځ | Phase 3 | As in PRD §9 | Known gap: ځ folds to ز (skeleton `z`) but Roman `dz` folds to `j`, so cross-script matching differs. |
| D-05c | Aspirates (کھ) vs خ in Roman search | Phase 3 | Aliases per song | |
| D-08 | Submission channel | Phase 3 | None | |
| D-09 | Analytics provider, or none | Phase 3 | None | |
| D-10 | UI language for beta | Phase 3 | English only | |
| D-13 | Permission form and contributor agreement wording | Phase 2 | PRD v3 §D.2 outlines, pending L-9 | |
| D-13b | Private evidence store (location, encryption, access) | Phase 2 | None | Must be outside this repository. |
| D-14 | Whether to pursue E2/E3 routes | After L-1–L-3 | Permission-only (E4/E5) | |
| D-16 | Copy/share of lyric text per license | Phase 2 | Native text selection only; no lyric share-images unless the license allows | |
| D-18 | Operator legal name, jurisdiction, DMCA agent | Phase 3 | None | |
| D-19 | Whether to migrate to PostgreSQL | When PRD §10 conditions arise | Stay static | |

## Implementation choices (T-02, T-04)

Made while implementing PRD §5 and §7, and accepted with T-02/T-04 on 2026-10-10. The owner may revise any of them.

| Date | Choice | Why |
|---|---|---|
| 2026-10-10 | Original lyric lines accept `lang: khw` or `ur`, and `script: Arab` only. | PRD §3/§8 only describe Khowar and Urdu lines. Other languages can be added when a real song needs them. |
| 2026-10-10 | `recorded_on` is required for `own_choice` and `family_choice`, and optional for `official_release_credit` and `default_withheld`. | PRD §7 rule 1 says a choice "is recorded with a date". |
| 2026-10-10 | Evidence grade E0 must have no `evidence_ids`; E1–E5 need at least one. Ids cannot contain slashes. | E0 means "nothing documented" (§6). Blocking path-like ids keeps documents out of the repo (§5, D-13b). |
| 2026-10-10 | Original text must contain Arabic-script letters; Roman and English layers must not. Every line needs at least one rendering. | Catches swapped or missing layers. A stanza may still omit English entirely, as required by PRD §3. |
| 2026-10-10 | A song's `slug` must equal its file name. | Guarantees unique slugs. Astro only warns on duplicates by default. |
| 2026-10-10 | Credit/person consistency (unknown person, `own_choice` for a deceased person or a minor, `family_choice` for someone not recorded as deceased) is checked by `src/lib/credits/visibility.ts`. Superseded in T-03: now enforced at build time (see Confirmed). | Astro's `reference()` does not check that the referenced entry exists. |

## Implementation choices (T-03)

Made while implementing PRD §6. Conservative; the owner may revise any of them.

| Date | Choice | Why |
|---|---|---|
| 2026-10-10 | The build checks **technical completeness** of rights records, not legal validity. Results carry `legalValidity: "not_assessed_by_build"`. | An E4/E5 grade only claims documented permission. Whether a document is genuine and covers this use is a human/legal check against the private store. |
| 2026-10-10 | E4/E5 qualify only if unrevoked, with ≥ 1 evidence id and a recorded `license` (scope of permission). E2/E3 qualify only with `legal_advice_confirmed`. E0/E1 never qualify. Any `revoked_on` (even future-dated) blocks. | PRD §6; the license requirement is stricter than the SQL view (documented in `LYRIC_RULE_DIFFERENCES_FROM_SQL`). |
| 2026-10-10 | Each rendering layer that appears on any line needs its own qualifying record: Roman (`roman_popular` or `roman_editorial`) → `rights.transliteration`; English → `rights.translation_en`. A missing or non-qualifying layer record blocks the **whole song**; the layer is not silently dropped. | PRD §6 rule: "every displayed rendering layer has its own publishable record". |
| 2026-10-10 | Review requires `second_reader`, `verified_on`, and a second reader different from `transcribed_by` (case and spacing ignored). | D-12 independent review. |
| 2026-10-10 | A synthetic song with `status: published` is rejected by the schema, so every build fails (dev, preview, production). The production catalog also asserts that it contains no synthetic songs. | P1-5, enforced loudly rather than by silent filtering. |
| 2026-10-10 | Real (non-synthetic) songs appear only when publishable, in every mode. Synthetic songs appear only in development and preview (`KLA_SITE_MODE=preview`), always `noindex`, never when withdrawn. | PRD T-03: "synthetic songs render only in dev/preview with noindex". |
| 2026-10-10 | `npm run build` uses `astro build --force`. | Astro caches entries by file content: without `--force`, changing only a person file would not re-check the songs that credit them. Found by the build tests. |
| 2026-10-10 | `KLA_CONTENT_ROOT` env var overrides the content directory. Used only by the build tests. | Lets real builds run against temporary content without touching `src/content/`. |

**Known gaps:**
- No field records that someone has checked the evidence documents themselves (who reviewed them, and when). The build can only see that ids, a grade, a license and dates are recorded.
- Song titles (`titles.roman_popular`, `titles.en`) are not covered by layer records.
- Revocation takes effect at the next build, not instantly.

## Synthetic fixtures (T-05)

| Date | Choice | Why |
|---|---|---|
| 2026-10-10 | The three fixtures (`src/content/songs/test-fixture-0{1,2,3}.yaml`) use **letter-position sequences**, not Khowar wording. Urdu lines are plain Urdu test sentences ("this is a test line"). Credits use fictitious `Test Person A/B/C`; every rights record is E0. **Pending owner review** (D-15: the owner writes or checks the synthetic Khowar text). | The prompt forbids passing synthetic strings off as Khowar poetry; sequences make the joining-context coverage exact and checkable. |
| 2026-10-10 | The Roman layer uses a mechanical **test transliteration** that follows the PRD §9 fold targets (ݮ j, ݯ ch, ݰ sh, ݱ zh, ځ dz, څ ts; other letters one-to-one), prefixed `[test]`. It is not the D-05 editorial standard. | Gives T-11 search tests predictable Roman input; the owner may replace it. |
| 2026-10-10 | **The mechanical fixtures are kept permanently as Unicode regression tests.** They are not to be replaced with invented "authentic" Khowar poetry. | Owner. |

## Design and reader (T-08, T-09)

| Date | Choice | Why |
|---|---|---|
| 2026-10-10 | **D-17 provisional values** recorded in `docs/design-system/README.md`: paper `#f7f7f4`, ink `#1c2230`, Roman `#3f4757`, English `#5a6170`, accent `#7b2d3b`; centred verse; Urdu-digit stanza numbers. **Pending owner review**; D-17 is not final. | Owner reviews the visual system before it is confirmed. |
| 2026-10-10 | Provisional Khowar webfont: Noto Nastaliq Urdu 3.009, regular instance, 118 KB subset, `font-display: swap`, line-height 2.4. **D-03 remains open.** Latin uses system serif and sans stacks (0 KB). | Only Noto Nastaliq Urdu and Noto Naskh Arabic passed T-06; Nastaliq chosen provisionally for the reading page; one token switches it. |
| 2026-10-10 | Hidden layers are hidden **visually** (clip), not with `display: none`, so Roman and English stay in the accessibility tree. | PRD §8: no Khowar screen-reader voice, so the layers must stay available. |
| 2026-10-10 | Synthetic fixtures render through real song pages only in **preview builds** (`KLA_SITE_MODE=preview`, output to `dist-preview/`, everything noindex) or `astro dev`. "Development" is detected from the Astro command, **never from `NODE_ENV`**. | A build run with `NODE_ENV=test` was treated as development and emitted the synthetic pages. Found by the build tests, fixed, and covered by a regression test. |
| 2026-10-10 | Header and footer link to `/songs/`, `/search/`, `/about/`, `/rights/` and `/credits/`, which do not exist yet (T-22, T-11, T-23). | Phase 1 is local only; the links become valid as those tasks land. |

## Font evidence for D-03 (T-06, T-07) — findings, not a decision

D-03 stays **open** until the owner's manual Khowar typography review is complete (re-confirmed 2026-10-10). T-08 uses Noto Nastaliq Urdu only as a *provisional* reading font. Full data: `tests/fonts/results/2026-10-10/`.

| Date | Finding | Source |
|---|---|---|
| 2026-10-10 | **Gulzar 1.000 has none of the six Khowar letters** (ݮ ݯ ݰ ݱ ځ څ) in any cmap subtable. Browsers fall back to another font for them (Chromium used Times New Roman), and PRD §8 forbids splitting Arabic letters across fonts. | fontTools coverage; Chromium CDP |
| 2026-10-10 | **Awami Nastaliq 3.400 has no OpenType GSUB**, only Graphite tables. HarfBuzz and Chromium show every letter unjoined. It can only be judged in Firefox (Graphite). Confirms PRD: reference only. | fontTools tables; HarfBuzz shaping |
| 2026-10-10 | **Noto Nastaliq Urdu 3.009** and **Noto Naskh Arabic 2.021** cover every required code point, select distinct contextual forms for every Khowar letter, and shape identically after subsetting. Automatic checks only; letterforms not yet reviewed. | HarfBuzz 14.6.0 |
| 2026-10-10 | Served subset sizes (WOFF2): Noto Nastaliq Urdu 181 KB (variable font), or 123 KB if instanced to one regular weight; Noto Naskh Arabic 27 KB (16 KB regular only). The PRD's 120 KB target is met only by Naskh, or roughly met by a regular-only Nastaliq. | `font-report.md` |
| 2026-10-10 | **Language tags matter for Noto Naskh Arabic**: digits ۴ ۶ ۷ take Urdu-style forms only under `lang="ur"`; under `lang="khw"` they use the default forms. Noto Nastaliq Urdu shapes `khw` and `ur` identically. If Khowar should use Urdu-style forms, Khowar runs may need `font-language-override: "URD"` (D-03). | HarfBuzz language comparison |

## Open project questions (not PRD D-items)

| Date raised | Question | Status |
|---|---|---|
| 2026-10-10 | Initialize git and add a GitHub remote? Needed for per-step commits (PRD §14) and the CI workflow (T-01 acceptance). | Resolved 2026-10-10: git initialized, `origin` = github.com/ZohaibRahim/Chitral_Bazm, CI workflow added (checks only, no deploy). Pushing is done only on the owner's instruction. |
| 2026-10-10 | Keep the project inside OneDrive? `node_modules` and test artifacts are large and sync-heavy. | Open |
| 2026-10-10 | Is dark mode in the design scope? | Resolved 2026-10-10: **deferred.** Phase 1 is light mode only; tokens are semantic (`--color-surface`, `--color-ink`, …) so a dark theme can redefine them later. |
| 2026-10-10 | May design-system notes from `ui-ux-pro-max` be saved under `docs/design-system/`? | Resolved 2026-10-10: **approved.** |
