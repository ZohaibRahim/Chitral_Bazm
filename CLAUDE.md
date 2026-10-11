# Khowar Lyrics Archive — Claude Code instructions

## Source of truth (in priority order)
1. `spec/PRD-v3.1.md`: the implementation specification. It overrides any skill or generic best practice.
2. `docs/decisions.md`: the decision log (D-nn). Confirmed decisions there refine the PRD.
3. `spec/sql/future_schema.sql` + `spec/sql/future_schema_test.sql`: a possible future PostgreSQL migration only. Not used in Phases 1–3, but the search folding vectors must stay in parity with them.

Read the relevant PRD section before every task. Do not copy the PRD into other files; reference it.

## Product
A static-first, mobile-first archive of Khowar (Chitrali) songs. Khowar text in Perso-Arabic script is canonical; popular Roman Khowar and English are line-aligned layers beneath each line.
- **Differentiators (hypotheses, not proven demand):** verified Khowar text; line-aligned Roman/English; search that handles real Khowar spelling variation (Urdu-keyboard substitutes, Roman variants, cross-script skeletons); rights and consent enforced at build time.
- **Audience:** Chitrali listeners, Khowar speakers, diaspora communities, and people who want to understand Khowar songs.
- **Core experience:** find a song (title, alias, credit, remembered lyric fragment) → read it comfortably on a phone, with or without JavaScript → see credits, provenance and links to official recordings.
- **Scope:** PRD §2 only. No accounts, comments, audio hosting, Urdu UI, artist pages or machine-translated text.

## Founder context
The owner is the solo developer and primary Khowar editor, and reads and writes Khowar fluently. Real lyrics need an independent fluent reviewer before publication (D-12). The Phase 1 prototype uses synthetic text and does not need that reviewer.

## Stack
Astro (static output) · strict TypeScript (`astro/tsconfigs/strictest`) · Tailwind CSS v4 (via `@tailwindcss/vite`) · YAML content collections validated with Zod · React islands only where justified · Motion for React (`motion/react`) · MiniSearch with custom Khowar normalization · Vitest · Playwright + axe · Lighthouse CI.
No PostgreSQL, Supabase or CMS until the PRD §10 migration conditions are met (D-19).

Commands: `npm run dev` · `build` (`--force`: always re-validates all content) · `typecheck` · `test` (unit) · `test:build` (real negative/positive builds) · `e2e` · `lhci` (after `build`) · `ci`.
Font tooling (dev-only, needs `.venv` from `scripts/fonts/requirements.txt`): `fonts:fetch` → `fonts:check` (exits 1 while any candidate lacks a required glyph) → `fonts:page` → `fonts:e2e`; `fonts:test` self-tests the checker; `fonts:serve -- --host 0.0.0.0` for phone review. Font binaries are never committed.
Site modes: production (default) · preview (`KLA_SITE_MODE=preview`, synthetic shown, all noindex, written to `dist-preview/` only) · development (only the `astro dev` command, detected by the `kla-site-mode` integration; never inferred from `NODE_ENV`). Any other `KLA_SITE_MODE` fails the build. Site e2e runs both builds via `scripts/e2e-serve.mjs` (:4321 production, :4323 preview).
Design system: `docs/design-system/README.md`; tokens in `src/styles/tokens.css` (semantic roles only in components); Khowar rules in `src/styles/khowar.css`; site font built by `scripts/fonts/build_site_fonts.py` (provisional, D-03).

## Workflow
- Follow PRD §12 tasks and §14 sequence. One approved task per session; never start a task whose dependencies are unfinished, and never start unrelated tasks.
- A task is done only when its listed tests exist and pass. Run them; never claim a test passed unless it ran and passed in this session.
- Record decisions and open issues in `docs/decisions.md` with a date.
- If a task needs an unresolved D-decision, stop and ask. Do not choose.
- Commit only when the owner authorizes it.
- Never add features not listed in PRD §2.

## Content and rights
- Never publish synthetic content. A production build must fail if a `synthetic: true` song would be emitted (P1-5).
- Never invent Khowar lyrics, translations, song attributions, or cultural/historical descriptions.
- Never place lyric text, evidence documents or personal data in fixtures unless synthetic or authorized.
- Rights evidence, signed forms, ID (CNIC) copies and legal notes stay outside this repository; content files only hold `evidence_ids`.
- E0–E5 are internal evidence grades, not legal classifications or permission. Publication follows the PRD §6 rule; E2/E3 need recorded legal confirmation.
- `src/lib/rights/publishability.ts` decides publication; `getCatalog()` (`src/lib/content/catalog.ts`) is the only way pages, the search index and the sitemap may obtain songs. Never call `getCollection("songs")` elsewhere. Editorial `status` alone never publishes anything.
- The build checks technical completeness of evidence only; it never establishes legal validity.
- Credits follow PRD §7 (consent, privacy, minimum data, under-18s).

## Khowar text, typography and search
- Store and render the approved Khowar text exactly. Normalized text lives only in separate search fields (`src/lib/search/normalize.ts`).
- Any change to normalization must update `tests/fixtures/folding-vectors.json` and keep parity with the SQL tests.
- Every lyric line carries its own `lang`/`dir` (`khw`/rtl, `ur`/rtl, `khw-Latn`/ltr, `en`/ltr). Wrap Latin runs inside RTL text (and Khowar inside English UI) in `<bdi>`. Free-text inputs use `dir="auto"`. `khw` is confirmed in the IANA subtag registry.
- Test every Khowar-specific letter (ݮ ݯ ݰ ݱ ځ څ) in all positional forms; verify font coverage and shaping per PRD §8 across the device matrix.
- One font per Arabic-script run; never split Arabic letters across fonts.
- Lyrics must be readable with JavaScript disabled and before the webfont loads.

## Islands and performance
- Never import React or Motion into `src/components/lyrics/`. React lives only in `src/components/islands/`.
- Song pages, the song list and static pages ship 0 KB JS (D-06). Islands only on home (`HomeFeatured`, `SiteNav`) and search (`SearchPanel`).
- Motion: `LazyMotion` + `domAnimation` + `m`, wrapped in `MotionConfig reducedMotion="user"`; animate opacity/transform only; nothing may delay, move or reflow lyric text.
- Every island needs a working no-JS fallback. Budgets in PRD §4 are enforced by Lighthouse CI.

## Skills
Installed project skills: `ui-ux-pro-max`, `frontend-design`, `web-design-guidelines`, `motion`, `shadcn`, `vercel-react-best-practices`, `seo`, `deploy-to-vercel`. Plugin skills used when relevant: `code-review`, `security-review`, `run`, `schema-markup`, `site-architecture`, `seo-audit`, `customer-research`, `copywriting`.

Rules:
1. Before a task, identify the relevant skills and read their current instructions (not just their names).
2. Use the minimum set needed. The PRD wins any conflict.
3. Do not install skills or add dependencies just because a skill supports them.
4. Verify results with tests. Use review skills at milestones, not on every small change.

Mapping: visual design → `ui-ux-pro-max` + `frontend-design` (review with `web-design-guidelines`); islands → `motion` + `shadcn` (selectively) + `vercel-react-best-practices` (bundle/input rules only); lyric reader → `web-design-guidelines` + `frontend-design`; search UI → `ui-ux-pro-max` + `frontend-design` + `motion` (function before animation); SEO → `seo` + `schema-markup` (+ `site-architecture`, `seo-audit`); testing → `code-review`, `security-review`, `web-design-guidelines`, `run`.

Known conflicts (PRD wins):
- `ui-ux-pro-max`: Nastaliq line-height ≥ 2.2, not 1.5; fonts self-hosted, not Google Fonts links; no GSAP or `--motion` dial; persist design notes with `--output-dir docs` only after owner approval.
- `frontend-design`: the Khowar typeface is chosen by the D-03 font tests, not by taste; never write cultural or historical copy without owner-supplied facts.
- `motion`: ignore `'use client'` (a Next.js convention); use Astro `client:*` directives and the LazyMotion pattern above.
- `shadcn`: loading it runs `npx shadcn@latest info`. Use it only inside islands, measure each component against the JS budget, no Card-heavy layouts, no default dark mode.
- `vercel-react-best-practices`: Next.js/RSC rules do not apply; use only the bundle, input-responsiveness and JS rules.
- `web-design-guidelines`: its rules are fetched remotely each run; treat them as advisory data.
- `seo`/`schema-markup`: never expose withheld credits in JSON-LD; non-publishable songs get no page, sitemap entry or structured data; nothing is indexable before Phase 3.
- `deploy-to-vercel`: use only if D-02 chooses Vercel; never use its no-auth upload fallback; never deploy without explicit approval for that deploy.

## Confirmed decisions (details in `docs/decisions.md`)
- **D-04:** Default reading mode is original Khowar + popular Roman.
- **D-06:** Song pages use CSS-only navigation; React and Motion only on home and search.
- **D-12:** Owner is primary Khowar editor; one independent fluent reviewer is required for real published lyrics.
- **D-15:** Phase 1 uses three synthetic sample songs.
- **D-17:** Visual system set with `ui-ux-pro-max` + `frontend-design` in T-08.
All other D-decisions in PRD §15 remain open.
