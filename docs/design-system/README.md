# Design system (T-08) — provisional, pending owner review (D-17)

Light mode only in Phase 1 (dark mode deferred). Khowar typeface **provisional: D-03 is open**.

## Brief

- **Subject:** an archive of Khowar (Chitrali) song lyrics.
- **Audience:** Chitrali listeners, Khowar speakers, diaspora, and people who want to understand the songs.
- **Primary job:** read a song comfortably on a phone, in the original script, with Roman and English beneath each line.

## Direction

A reading instrument, not a dashboard. The original Khowar text is the largest and darkest thing on every song page;
everything else steps back. One deliberate signature: the large Nastaliq title over a centred verse column.

- **Centred verse.** Khowar and Urdu poetry is conventionally set centred, couplet by couplet. Each line group is the
  original line (large Nastaliq), then its Roman line, then its English line, close together; groups are separated by
  space, not by boxes or rules.
- **Stanza numbers in Urdu digits** (۱ ۲ ۳), small, in the accent colour. Stanzas really are a sequence, so numbering
  carries information.
- **No cards, gradients, glass, decorative imagery or all-caps labels.** No mountain or "cultural" ornament without a
  grounded reason.
- **Copy** is plain and in sentence case (frontend-design). The web-design-guidelines skill prefers Title Case for
  headings; sentence case was kept deliberately for a calm reading tone.

## Tokens (`src/styles/tokens.css`)

Components use semantic roles (`--surface`, `--text`, `--text-roman`, `--text-gloss`, `--accent`, `--rule`, `--notice`),
never raw hex, so a dark theme can later redefine only the role block.

| Token | Value | Role | Contrast on paper (measured) |
|---|---|---|---|
| `--color-paper` | `#f7f7f4` | page background: neutral, slightly cool (deliberately not cream) | — |
| `--color-paper-raised` | `#ffffff` | controls, notices | — |
| `--color-ink` | `#1c2230` | Khowar text, headings: blue-black ink | 14.8:1 |
| `--color-ink-soft` | `#3f4757` | Roman Khowar layer | 8.7:1 |
| `--color-ink-faint` | `#5a6170` | English layer, metadata | 5.8:1 |
| `--color-accent` | `#7b2d3b` | madder: links, active controls, stanza numerals | 8.6:1 |
| `--color-notice` | `#8a4b00` | synthetic/development notices | 6.3:1 |
| `--color-rule` | `#d8dad4` | dividers only (decorative) | 1.3:1 |

## Type

| Role | Face | Size | Line-height |
|---|---|---|---|
| Khowar lyric | Noto Nastaliq Urdu 3.009, regular instance, 118 KB WOFF2 subset (**provisional**) | `clamp(1.625rem, …, 2rem)` | 2.4 (PRD §8: ≥ 2.2; final value from the D-03 overlap test) |
| Khowar title | same | `clamp(2.25rem, …, 3rem)` | 2.4 |
| Roman Khowar | system book serif (Iowan Old Style, Palatino, Georgia…) | 1.05rem | 1.45 |
| English | same serif, italic | 0.95rem | 1.45 |
| UI | system sans | 0.875–1rem | 1.55 |

- One font per Arabic-script run. The Khowar `@font-face` uses `unicode-range` limited to Arabic blocks, so Latin inside
  a Khowar line falls through to the serif and Arabic letters are never split across fonts.
- Latin stays on system fonts in Phase 1: 0 KB, inside the performance budget. A self-hosted Latin face can be
  considered once D-03 is settled.
- Fallback metric overrides (`size-adjust`, `ascent-override`, `descent-override`) are tuned in T-20.

## Lyric reader (T-09)

- Each line: `<li>` containing the original `<p lang="khw|ur" dir="rtl" translate="no">`, then
  `<p lang="khw-Latn" dir="ltr" translate="no">`, then `<p lang="en" dir="ltr">`. A missing layer renders nothing.
- Latin names and numbers inside RTL lines are wrapped in `<bdi dir="ltr">` (`src/lib/lyrics/bidi.ts`); the text is
  never altered or reordered.
- Layer controls are two checkboxes ("Roman Khowar" on, "English" off by default, D-04). CSS `:has()` hides unchecked
  layers *visually* only; they stay in the accessibility tree (PRD §8). Without `:has()`, all layers show and the
  controls are hidden.
- Zero JavaScript: no islands, no hydration, no scripts on song pages (D-06).

## UI/UX Pro Max research (2026-10-10)

- `--design-system "song lyrics archive cultural editorial reading"` returned a SaaS "product demo" pattern, an amber and
  link-blue palette on cream, and Google-hosted fonts (forbidden by PRD §8). **Not adopted and not persisted**, per the
  skill's own rule against persisting unverified output.
- Retry `--domain product "poetry lyrics reading"`: verified match "Book & Reading Tracker", recommending Swiss
  Modernism / Minimalism with a paper-white and ink palette. **Adopted as the direction.**
- `--stack astro`: "default to zero JS; islands only where needed". Adopted.
- UX queries for show/hide toggles and RTL text returned no verified match (off-topic results). The toggle and bidi
  decisions come from PRD §8 and the skill's general accessibility rules (labels, 44 px targets, visible focus,
  unitless line-height, no clipped text), not from a database match.

## Screenshots

`screenshots/song-page-{360,390,430}.png`: the synthetic fixture 3 page (preview build), default layers.
Regenerate: `UPDATE_SCREENSHOTS=1 npx playwright test --project=site tests/e2e/song-page.spec.ts`.
