# Font report (T-06)

Generated 2026-10-10T19:22:28-07:00 with HarfBuzz 14.6.0, fontTools 4.66.1, Unicode joining data 18.0.0.

**Automatic checks verify Unicode coverage and that HarfBuzz selects glyphs without .notdef. They do not verify that the glyphs are correct Khowar letterforms, nor how browsers render them. Those need visual review (P1-1).**

## Summary

| Font | Version | Role | Required missing | .notdef (shaping) | Joined = isolated | Subset shaping identical | Served WOFF2 | Automatic result |
|---|---|---|---|---|---|---|---|---|
| Noto Nastaliq Urdu | Version 3.009 | candidate | 0 | 0 | 0 | yes | 181 KB | PASS (automatic checks only; visual review pending) |
| Gulzar | Version 1.000;[7b34f74]; ttfautohint (v1.8.4) | candidate | 6 (U+076E ݮ, U+076F ݯ, U+0770 ݰ, U+0771 ݱ, U+0681 ځ, U+0685 څ) | 39 | 34 | yes | 194 KB | FAIL |
| Noto Naskh Arabic | Version 2.021 | candidate (Naskh fallback) | 0 | 0 | 0 | yes | 27 KB | PASS (automatic checks only; visual review pending) |
| Awami Nastaliq | Version 3.400 | reference only (Graphite; Firefox) | 0 | 0 | 242 | n/a (not subset) | 324 KB | PASS (automatic checks only; visual review pending) |

## Khowar letters by font

### Noto Nastaliq Urdu

| Letter | Form | Glyphs | Notes |
|---|---|---|---|
| ݮ U+076E (D) | isolated | TahSmallEnclNS HahSep |  |
| ݮ U+076E (D) | initial_zwj | TahSmallBelowNS sp0 HahIni |  |
| ݮ U+076E (D) | medial_zwj | TahSmallBelowNS HahMed | ligature with neighbour |
| ݮ U+076E (D) | final_zwj | TahSmallEnclNS HahFin | ligature with neighbour |
| ݮ U+076E (D) | initial_real | TahSmallBelowNS sp0 HahIni.outT2 |  |
| ݮ U+076E (D) | medial_real | TahSmallBelowNS HahMed.inD2outT2 |  |
| ݮ U+076E (D) | final_real | TahSmallEnclNS HahFin |  |
| ݯ U+076F (D) | isolated | Tah2DotsEnclNS HahSep |  |
| ݯ U+076F (D) | initial_zwj | Tah2DotsBelowNS sp0 HahIni |  |
| ݯ U+076F (D) | medial_zwj | Tah2DotsBelowNS HahMed | ligature with neighbour |
| ݯ U+076F (D) | final_zwj | Tah2DotsEnclNS HahFin | ligature with neighbour |
| ݯ U+076F (D) | initial_real | Tah2DotsBelowNS sp0 HahIni.outT2 |  |
| ݯ U+076F (D) | medial_real | Tah2DotsBelowNS HahMed.inD2outT2 |  |
| ݯ U+076F (D) | final_real | Tah2DotsEnclNS HahFin |  |
| ݰ U+0770 (D) | isolated | Tah2DotsAboveNS SeenSep |  |
| ݰ U+0770 (D) | initial_zwj | Tah2DotsAboveNS sp0 SeenIni |  |
| ݰ U+0770 (D) | medial_zwj | Tah2DotsAboveNS SeenMed | ligature with neighbour |
| ݰ U+0770 (D) | final_zwj | Tah2DotsAboveNS SeenFin | ligature with neighbour |
| ݰ U+0770 (D) | initial_real | Tah2DotsAboveNS sp0 SeenIni.outT2 |  |
| ݰ U+0770 (D) | medial_real | Tah2DotsAboveNS SeenMed.inT2outT2 |  |
| ݰ U+0770 (D) | final_real | Tah2DotsAboveNS SeenFin |  |
| ݱ U+0771 (R) | isolated | Tah2DotsAboveNS RehSep |  |
| ݱ U+0771 (R) | final_zwj | Tah2DotsAboveNS RehFin | ligature with neighbour |
| ݱ U+0771 (R) | final_real | Tah2DotsAboveNS RehFin.inD4B |  |
| ݱ U+0771 (R) | zwnj_isolated | Tah2DotsAboveNS RehSep | ligature with neighbour |
| ځ U+0681 (D) | isolated | HamzaAboveNS HahSep |  |
| ځ U+0681 (D) | initial_zwj | HamzaAboveNS sp0 HahIni |  |
| ځ U+0681 (D) | medial_zwj | HamzaAboveNS HahMed | ligature with neighbour |
| ځ U+0681 (D) | final_zwj | HamzaAboveNS HahFin | ligature with neighbour |
| ځ U+0681 (D) | initial_real | HamzaAboveNS sp0 HahIni.outT2 |  |
| ځ U+0681 (D) | medial_real | HamzaAboveNS HahMed.inD2outT2 |  |
| ځ U+0681 (D) | final_real | HamzaAboveNS HahFin |  |
| څ U+0685 (D) | isolated | ThreeDotsUpAboveNS HahSep |  |
| څ U+0685 (D) | initial_zwj | ThreeDotsUpAboveNS sp0 HahIni |  |
| څ U+0685 (D) | medial_zwj | ThreeDotsUpAboveNS HahMed | ligature with neighbour |
| څ U+0685 (D) | final_zwj | ThreeDotsUpAboveNS HahFin | ligature with neighbour |
| څ U+0685 (D) | initial_real | ThreeDotsUpAboveNS sp0 HahIni.outT2 |  |
| څ U+0685 (D) | medial_real | ThreeDotsUpAboveNS HahMed.inD2outT2 |  |
| څ U+0685 (D) | final_real | ThreeDotsUpAboveNS HahFin |  |

### Gulzar

| Letter | Form | Glyphs | Notes |
|---|---|---|---|
| ݮ U+076E (D) | isolated | .notdef | **.notdef** |
| ݮ U+076E (D) | initial_zwj | .notdef | **.notdef**, **same glyph as isolated** |
| ݮ U+076E (D) | medial_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݮ U+076E (D) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݮ U+076E (D) | initial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݮ U+076E (D) | medial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݮ U+076E (D) | final_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݯ U+076F (D) | isolated | .notdef | **.notdef** |
| ݯ U+076F (D) | initial_zwj | .notdef | **.notdef**, **same glyph as isolated** |
| ݯ U+076F (D) | medial_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݯ U+076F (D) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݯ U+076F (D) | initial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݯ U+076F (D) | medial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݯ U+076F (D) | final_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݰ U+0770 (D) | isolated | .notdef | **.notdef** |
| ݰ U+0770 (D) | initial_zwj | .notdef | **.notdef**, **same glyph as isolated** |
| ݰ U+0770 (D) | medial_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݰ U+0770 (D) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݰ U+0770 (D) | initial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݰ U+0770 (D) | medial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݰ U+0770 (D) | final_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݱ U+0771 (R) | isolated | .notdef | **.notdef** |
| ݱ U+0771 (R) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ݱ U+0771 (R) | final_real | .notdef | **.notdef**, **same glyph as isolated** |
| ݱ U+0771 (R) | zwnj_isolated | .notdef | **.notdef**, ligature with neighbour |
| ځ U+0681 (D) | isolated | .notdef | **.notdef** |
| ځ U+0681 (D) | initial_zwj | .notdef | **.notdef**, **same glyph as isolated** |
| ځ U+0681 (D) | medial_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ځ U+0681 (D) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| ځ U+0681 (D) | initial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ځ U+0681 (D) | medial_real | .notdef | **.notdef**, **same glyph as isolated** |
| ځ U+0681 (D) | final_real | .notdef | **.notdef**, **same glyph as isolated** |
| څ U+0685 (D) | isolated | .notdef | **.notdef** |
| څ U+0685 (D) | initial_zwj | .notdef | **.notdef**, **same glyph as isolated** |
| څ U+0685 (D) | medial_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| څ U+0685 (D) | final_zwj | .notdef | **.notdef**, **same glyph as isolated**, ligature with neighbour |
| څ U+0685 (D) | initial_real | .notdef | **.notdef**, **same glyph as isolated** |
| څ U+0685 (D) | medial_real | .notdef | **.notdef**, **same glyph as isolated** |
| څ U+0685 (D) | final_real | .notdef | **.notdef**, **same glyph as isolated** |

### Noto Naskh Arabic

| Letter | Form | Glyphs | Notes |
|---|---|---|---|
| ݮ U+076E (D) | isolated | tahcenterar uni062D |  |
| ݮ U+076E (D) | initial_zwj | tahbelowar uni062D.init |  |
| ݮ U+076E (D) | medial_zwj | tahbelowar uni062D.medi | ligature with neighbour |
| ݮ U+076E (D) | final_zwj | tahcenterar uni062D.fina | ligature with neighbour |
| ݮ U+076E (D) | initial_real | tahbelowar uni062D.init |  |
| ݮ U+076E (D) | medial_real | tahbelowar uni062D.medi |  |
| ݮ U+076E (D) | final_real | tahcenterar uni062D.fina |  |
| ݯ U+076F (D) | isolated | twodotshorizontalcenter_tahabovear uni062D |  |
| ݯ U+076F (D) | initial_zwj | twodotshorizontalbelow_tahabovear uni062D.init |  |
| ݯ U+076F (D) | medial_zwj | twodotshorizontalbelow_tahabovear uni062D.medi | ligature with neighbour |
| ݯ U+076F (D) | final_zwj | twodotshorizontalcenter_tahabovear uni062D.fina | ligature with neighbour |
| ݯ U+076F (D) | initial_real | twodotshorizontalbelow_tahabovear uni062D.init |  |
| ݯ U+076F (D) | medial_real | twodotshorizontalbelow_tahabovear uni062D.medi |  |
| ݯ U+076F (D) | final_real | twodotshorizontalcenter_tahabovear uni062D.fina |  |
| ݰ U+0770 (D) | isolated | twodotshorizontalabove_tahabovear uni0633 |  |
| ݰ U+0770 (D) | initial_zwj | twodotshorizontalabove_tahabovear uni0633.init |  |
| ݰ U+0770 (D) | medial_zwj | twodotshorizontalabove_tahabovear uni0633.medi | ligature with neighbour |
| ݰ U+0770 (D) | final_zwj | twodotshorizontalabove_tahabovear uni0633.fina | ligature with neighbour |
| ݰ U+0770 (D) | initial_real | twodotshorizontalabove_tahabovear uni0633.init |  |
| ݰ U+0770 (D) | medial_real | twodotshorizontalabove_tahabovear uni0633.medi |  |
| ݰ U+0770 (D) | final_real | twodotshorizontalabove_tahabovear uni0633.fina |  |
| ݱ U+0771 (R) | isolated | twodotshorizontalabove_tahabovear uni0631 |  |
| ݱ U+0771 (R) | final_zwj | twodotshorizontalabove_tahabovear uni0631.fina | ligature with neighbour |
| ݱ U+0771 (R) | final_real | twodotshorizontalabove_tahabovear uni0631.fina |  |
| ݱ U+0771 (R) | zwnj_isolated | twodotshorizontalabove_tahabovear uni0631 | ligature with neighbour |
| ځ U+0681 (D) | isolated | uni0654 uni062D |  |
| ځ U+0681 (D) | initial_zwj | uni0654 uni062D.init |  |
| ځ U+0681 (D) | medial_zwj | uni0654 uni062D.medi | ligature with neighbour |
| ځ U+0681 (D) | final_zwj | uni0654 uni062D.fina | ligature with neighbour |
| ځ U+0681 (D) | initial_real | uni0654 uni062D.init |  |
| ځ U+0681 (D) | medial_real | uni0654 uni062D.medi |  |
| ځ U+0681 (D) | final_real | uni0654 uni062D.fina |  |
| څ U+0685 (D) | isolated | threedotsupabovear uni062D |  |
| څ U+0685 (D) | initial_zwj | threedotsupabovear uni062D.init |  |
| څ U+0685 (D) | medial_zwj | threedotsupabovear uni062D.medi | ligature with neighbour |
| څ U+0685 (D) | final_zwj | threedotsupabovear uni062D.fina | ligature with neighbour |
| څ U+0685 (D) | initial_real | threedotsupabovear uni062D.init |  |
| څ U+0685 (D) | medial_real | threedotsupabovear uni062D.medi |  |
| څ U+0685 (D) | final_real | threedotsupabovear uni062D.fina |  |

### Awami Nastaliq

| Letter | Form | Glyphs | Notes |
|---|---|---|---|
| ݮ U+076E (D) | isolated | absHahSmallTahBelow |  |
| ݮ U+076E (D) | initial_zwj | absHahSmallTahBelow | **same glyph as isolated** |
| ݮ U+076E (D) | medial_zwj | absHahSmallTahBelow | **same glyph as isolated**, ligature with neighbour |
| ݮ U+076E (D) | final_zwj | absHahSmallTahBelow | **same glyph as isolated**, ligature with neighbour |
| ݮ U+076E (D) | initial_real | absHahSmallTahBelow | **same glyph as isolated** |
| ݮ U+076E (D) | medial_real | absHahSmallTahBelow | **same glyph as isolated** |
| ݮ U+076E (D) | final_real | absHahSmallTahBelow | **same glyph as isolated** |
| ݯ U+076F (D) | isolated | absHahSmallTahTwoDots |  |
| ݯ U+076F (D) | initial_zwj | absHahSmallTahTwoDots | **same glyph as isolated** |
| ݯ U+076F (D) | medial_zwj | absHahSmallTahTwoDots | **same glyph as isolated**, ligature with neighbour |
| ݯ U+076F (D) | final_zwj | absHahSmallTahTwoDots | **same glyph as isolated**, ligature with neighbour |
| ݯ U+076F (D) | initial_real | absHahSmallTahTwoDots | **same glyph as isolated** |
| ݯ U+076F (D) | medial_real | absHahSmallTahTwoDots | **same glyph as isolated** |
| ݯ U+076F (D) | final_real | absHahSmallTahTwoDots | **same glyph as isolated** |
| ݰ U+0770 (D) | isolated | absSeenSmallTahTwoDots |  |
| ݰ U+0770 (D) | initial_zwj | absSeenSmallTahTwoDots | **same glyph as isolated** |
| ݰ U+0770 (D) | medial_zwj | absSeenSmallTahTwoDots | **same glyph as isolated**, ligature with neighbour |
| ݰ U+0770 (D) | final_zwj | absSeenSmallTahTwoDots | **same glyph as isolated**, ligature with neighbour |
| ݰ U+0770 (D) | initial_real | absSeenSmallTahTwoDots | **same glyph as isolated** |
| ݰ U+0770 (D) | medial_real | absSeenSmallTahTwoDots | **same glyph as isolated** |
| ݰ U+0770 (D) | final_real | absSeenSmallTahTwoDots | **same glyph as isolated** |
| ݱ U+0771 (R) | isolated | absRehSmallTahTwoDots |  |
| ݱ U+0771 (R) | final_zwj | absRehSmallTahTwoDots | **same glyph as isolated**, ligature with neighbour |
| ݱ U+0771 (R) | final_real | absRehSmallTahTwoDots | **same glyph as isolated** |
| ݱ U+0771 (R) | zwnj_isolated | absRehSmallTahTwoDots | ligature with neighbour |
| ځ U+0681 (D) | isolated | absHahHamzaAbove |  |
| ځ U+0681 (D) | initial_zwj | absHahHamzaAbove | **same glyph as isolated** |
| ځ U+0681 (D) | medial_zwj | absHahHamzaAbove | **same glyph as isolated**, ligature with neighbour |
| ځ U+0681 (D) | final_zwj | absHahHamzaAbove | **same glyph as isolated**, ligature with neighbour |
| ځ U+0681 (D) | initial_real | absHahHamzaAbove | **same glyph as isolated** |
| ځ U+0681 (D) | medial_real | absHahHamzaAbove | **same glyph as isolated** |
| ځ U+0681 (D) | final_real | absHahHamzaAbove | **same glyph as isolated** |
| څ U+0685 (D) | isolated | absHahThreeDotsAbove |  |
| څ U+0685 (D) | initial_zwj | absHahThreeDotsAbove | **same glyph as isolated** |
| څ U+0685 (D) | medial_zwj | absHahThreeDotsAbove | **same glyph as isolated**, ligature with neighbour |
| څ U+0685 (D) | final_zwj | absHahThreeDotsAbove | **same glyph as isolated**, ligature with neighbour |
| څ U+0685 (D) | initial_real | absHahThreeDotsAbove | **same glyph as isolated** |
| څ U+0685 (D) | medial_real | absHahThreeDotsAbove | **same glyph as isolated** |
| څ U+0685 (D) | final_real | absHahThreeDotsAbove | **same glyph as isolated** |

## Sizes

| Font | Original TTF | Original WOFF2 | Subset TTF | Subset WOFF2 (served to the test page) | Subset WOFF2, regular weight only (measured, not served) |
|---|---|---|---|---|---|
| Noto Nastaliq Urdu | 674 KB | 261 KB | 457 KB | 181 KB | 123 KB |
| Gulzar | 941 KB | 232 KB | 833 KB | 194 KB | — |
| Noto Naskh Arabic | 300 KB | 120 KB | 52 KB | 27 KB | 16 KB |
| Awami Nastaliq | 629 KB | 324 KB | — | — | — |

## Language systems and language-tag behaviour

| Font | GSUB arab language systems | khw shaped same as ur | ar same as ur | Graphite tables |
|---|---|---|---|---|
| Noto Nastaliq Urdu | ARA, FAR, KSH, SND, URD, dflt | True | False | — |
| Gulzar | ARA, FAR, SND, URD, dflt | True | False | — |
| Noto Naskh Arabic | FAR, KSH, KUR, RHG, SND, URD, dflt | False | False | — |
| Awami Nastaliq | — | True | True | Feat, Glat, Gloc, Silf, Sill |

**Noto Naskh Arabic: glyphs that differ when text is tagged `khw` instead of `ur`:**

- ۴ U+06F4: ur=uni06F4.locl khw=uni06F4
- ۶ U+06F6: ur=uni0666 khw=uni06F6
- ۷ U+06F7: ur=uni06F7.locl khw=uni06F7

## Marks

| Font | Cases | .notdef | Dotted circle | Mark offset (0,0) |
|---|---|---|---|---|
| Noto Nastaliq Urdu | 70 | 0 | 0 | 0 |
| Gulzar | 70 | 60 | 0 | 0 |
| Noto Naskh Arabic | 70 | 0 | 0 | 0 |
| Awami Nastaliq | 70 | 0 | 0 | 0 |
