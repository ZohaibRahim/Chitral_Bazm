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
| D-16b | Genre vocabulary | Phase 2 | Short list from v2 genres | PRD v2 is not in this repository. |
| D-18 | Operator legal name, jurisdiction, DMCA agent | Phase 3 | None | |
| D-19 | Whether to migrate to PostgreSQL | When PRD §10 conditions arise | Stay static | |

## Implementation choices needing owner confirmation (T-02, T-04)

Made while implementing PRD §5 and §7. Each is conservative and easy to change, but none is confirmed yet.

| Date | Choice | Why |
|---|---|---|
| 2026-10-11 | Added optional `is_minor` to the person schema (not in the PRD §5 field list). Minors are always shown as withheld, and `own_choice` for a minor is rejected. | PRD §7 rule 6 (under-18s) cannot be enforced without knowing who is a minor. The schema has no way to record guardian consent, so no minor is ever named until a consent field and process are decided. |
| 2026-10-11 | `GENRES` is an empty list, so any `genre` value fails validation. | D-16b is open, and its provisional default refers to PRD v2, which is not in this repository. |
| 2026-10-11 | Original lyric lines accept `lang: khw` or `ur`, and `script: Arab` only. | PRD §3/§8 only describe Khowar and Urdu lines. Other languages can be added when a real song needs them. |
| 2026-10-11 | `recorded_on` is required for `own_choice` and `family_choice`, and optional for `official_release_credit` and `default_withheld`. | PRD §7 rule 1 says a choice "is recorded with a date". |
| 2026-10-11 | Evidence grade E0 must have no `evidence_ids`; E1–E5 need at least one. Ids cannot contain slashes. | E0 means "nothing documented" (§6). Blocking path-like ids keeps documents out of the repo (§5, D-13b). |
| 2026-10-11 | Original text must contain Arabic-script letters; Roman and English layers must not. Every line needs at least one rendering. | Catches swapped or missing layers. A stanza may still omit English entirely, as required by PRD §3. |
| 2026-10-11 | A song's `slug` must equal its file name. | Guarantees unique slugs. Astro only warns on duplicates by default. |
| 2026-10-11 | Credit/person consistency (unknown person, `own_choice` for a deceased person, `family_choice` for someone not recorded as deceased) is checked by `src/lib/credits/visibility.ts`. It becomes a build failure once a page renders credits (T-09). | Astro's `reference()` does not check that the referenced entry exists, so a schema alone cannot enforce it. |

## Open project questions (not PRD D-items)

| Date raised | Question | Status |
|---|---|---|
| 2026-10-10 | Initialize git and add a GitHub remote? Needed for per-step commits (PRD §14) and the CI workflow (T-01 acceptance). | Resolved 2026-10-11: git initialized, `origin` = github.com/ZohaibRahim/Chitral_Bazm, CI workflow added (checks only, no deploy). Pushing is done only on the owner's instruction. |
| 2026-10-10 | Keep the project inside OneDrive? `node_modules` and test artifacts are large and sync-heavy. | Open |
| 2026-10-10 | Is dark mode in the design scope? | Open |
| 2026-10-10 | May design-system notes from `ui-ux-pro-max` be saved under `docs/design-system/`? | Open |
