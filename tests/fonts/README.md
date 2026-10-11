# Font tests (T-06, T-07)

Development only. Nothing here is part of the public site.

## Regenerate

```sh
python -m venv .venv
.venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt   # macOS/Linux: .venv/bin/python
npm run fonts:fetch   # official sources only; verified against fonts.json / fonts.lock.json
npm run fonts:check   # coverage + shaping + subset report -> results/<date>/font-report.{json,md}
npm run fonts:page    # writes font-test.html from the report
npm run fonts:e2e     # Chromium checks + screenshots at 360/390/430 px
npm run fonts:test    # self-tests for the checker
```

`fonts:check` exits 1 while any candidate lacks a required Khowar glyph (currently Gulzar). That is the intended signal, not a tooling error.

## What each result means

| Evidence | Proves | Does not prove |
|---|---|---|
| Unicode coverage (`font-report`) | The font maps the code point to a glyph | That the glyph is the right letter |
| Shaping (`font-report`, HarfBuzz) | Contextual glyphs are selected, no `.notdef`, subsetting preserved shaping | Correct Khowar letterforms; Graphite behaviour |
| `browser-chromium.json` | Which font Chromium actually used for each specimen | Other browsers; visual correctness |
| Your review (`review-*.json`) | Whether a fluent Khowar reader accepts the letterforms | — |

## Device review (P1-1)

1. On the computer: `npm run fonts:serve -- --host 0.0.0.0`.
2. On a phone on the same Wi-Fi, open `http://<computer's LAN IP>:4322/font-test.html`.
3. Review in Chrome Android, Samsung Internet, iOS Safari and Firefox Android (Firefox is the only one that renders Awami Nastaliq correctly).
4. Fill in section 2, export the JSON, and save it as `results/<date>/review-<device>-<browser>.json`. Add screenshots to the same folder.
