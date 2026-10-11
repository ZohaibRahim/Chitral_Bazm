"""T-07: generate tests/fonts/font-test.html, the device-matrix page (PRD v3.1 §8 step 4).

Static HTML + CSS. A small inline script only exports the review checklist as JSON; the page is fully readable without
JavaScript. Specimens are code-point sequences, not words or lyrics. The page lives under tests/, is never built into
the site, and is marked noindex.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
from pathlib import Path

from khowar_chars import BEH, KHOWAR, MARKS, ZWJ, load_joining_types, name

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FONTS_DIR = ROOT / "tests" / "fonts"
JOINING = load_joining_types(HERE / "data" / "ArabicShaping.txt")

# Urdu-keyboard substitutes from the loose search fold (PRD §9); shown side by side so differences are visible.
SUBSTITUTE = {0x076E: 0x062C, 0x076F: 0x0686, 0x0770: 0x0634, 0x0771: 0x0698, 0x0681: 0x0632, 0x0685: 0x0686}
LINE_HEIGHTS = ["1.8", "2.2", "2.6"]
FORMS_D = ["isolated", "initial_zwj", "medial_zwj", "final_zwj", "initial_real", "medial_real", "final_real"]
FORMS_R = ["isolated", "final_zwj", "final_real"]


def form_text(cp: int, form: str) -> str:
    c, z, b = chr(cp), chr(ZWJ), chr(BEH)
    return {
        "isolated": c,
        "initial_zwj": c + z,
        "medial_zwj": z + c + z,
        "final_zwj": z + c,
        "initial_real": c + b,
        "medial_real": b + c + b,
        "final_real": b + c,
    }[form]


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def sequences() -> list[str]:
    """Letter sequences combining each Khowar letter with common Urdu letters. Synthetic; not words."""
    out = []
    for cp in KHOWAR:
        k = chr(cp)
        out += [f"{k}ا", f"ب{k}ی", f"م{k}ن", f"{k}ے", f"س{k}ر", f"ل{k}ہ"]
    return out


def build(fonts: list[dict], report: dict, date: str) -> str:
    by_id = {f["id"]: f for f in report["fonts"]}
    missing = {f["id"]: {m.split()[0] for m in by_id[f["id"]]["required_missing"]} for f in fonts}
    faces = "\n".join(
        f'@font-face {{ font-family: "KLA {esc(f["family"])}"; src: url("build/{esc(f["file"])}") format("woff2"); font-display: block; }}\n'
        f'.f-{f["id"]} {{ font-family: "KLA {esc(f["family"])}"; }}'
        for f in fonts
    )
    seqs = sequences()
    long_line = " ".join(seqs * 2)
    mixed_khw = " ".join(seqs[:10]) + " <bdi lang=\"en\" dir=\"ltr\">Test Name 2026</bdi> " + " ".join(seqs[10:16]) + " ۱۲۳"
    mixed_ur = "ب" + "ی".join(chr(c) for c in (0x0679, 0x0688, 0x0691, 0x06BA, 0x06BE, 0x06C1, 0x06D2)) + " " + " ".join(seqs[16:22])
    lang_specimen = "۰۱۲۳۴۵۶۷۸۹ ہ ھ ی ے ۓ ئ " + " ".join(chr(BEH) + chr(c) + chr(BEH) for c in KHOWAR)

    parts: list[str] = []
    add = parts.append

    add(f"""<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Khowar font test (T-07): development only</title>
<style>
{faces}
:root {{ --line: #c9c4bb; --muted: #5b5750; --bad: #9b1c1c; --ok: #1f5f3a; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0 auto; max-width: 64rem; padding: 1rem; font: 16px/1.5 system-ui, sans-serif; color: #1c1b19; background: #fbfaf7; }}
h1 {{ font-size: 1.5rem; }} h2 {{ font-size: 1.25rem; margin-top: 2.5rem; border-top: 2px solid var(--line); padding-top: 1rem; }}
h3 {{ font-size: 1.05rem; margin: 1.5rem 0 .5rem; }}
.notice {{ border: 2px solid var(--bad); padding: .75rem 1rem; background: #fff; }}
table {{ border-collapse: collapse; width: 100%; font-size: .875rem; }} th, td {{ border: 1px solid var(--line); padding: .35rem .5rem; text-align: left; vertical-align: top; }}
.table-wrap {{ overflow-x: auto; }}
.font-row {{ margin: .5rem 0 1rem; }} .font-name {{ font-size: .8rem; color: var(--muted); }}
.cells {{ display: flex; flex-wrap: wrap; gap: .4rem; }}
.cell {{ display: flex; flex-direction: column; align-items: center; min-width: 4.5rem; border: 1px solid var(--line); background: #fff; padding: .25rem; }}
.cell .sp {{ font-size: 2.25rem; line-height: 2.4; }} .cell small {{ font-size: .7rem; color: var(--muted); }}
.cell.missing {{ border-color: var(--bad); background: #fdf0f0; }} .cell.missing small {{ color: var(--bad); }}
.rtl {{ font-size: 1.6rem; }} .lh {{ background: linear-gradient(#f1ede5 50%, #fff 50%); }}
.lh-1-8 {{ line-height: 1.8; background-size: 100% 3.6em; }} .lh-2-2 {{ line-height: 2.2; background-size: 100% 4.4em; }} .lh-2-6 {{ line-height: 2.6; background-size: 100% 5.2em; }}
fieldset {{ border: 1px solid var(--line); margin: .5rem 0; }} legend {{ font-weight: 600; }}
.review label {{ margin-inline-end: 1rem; white-space: nowrap; }}
textarea {{ width: 100%; min-height: 8rem; font-family: ui-monospace, monospace; }}
.tag {{ font-size: .75rem; padding: 0 .35rem; border-radius: .25rem; background: #ece7dc; }}
</style>
</head>
<body>
<h1>Khowar font test (T-07)</h1>
<p class="notice"><strong>Development tool only.</strong> Not part of the public site, never deployed with it, and marked
<code>noindex</code>. Every specimen below is a synthetic letter sequence, not a word or a lyric. Generated {esc(date)} from
<code>scripts/fonts/build_test_page.py</code>.</p>

<h2 id="results">What is verified, and by what</h2>
<div class="table-wrap"><table>
<thead><tr><th>Font</th><th>Version</th><th>Role</th><th>1. Unicode coverage<br><small>verified automatically (fontTools)</small></th>
<th>2. Shaping<br><small>verified automatically (HarfBuzz {esc(report["tools"]["harfbuzz"])}, OpenType only)</small></th>
<th>3. Browser rendering<br><small>Chromium: automated (Playwright). Other browsers: manual.</small></th>
<th>4. Correct Khowar letterforms<br><small>needs a fluent Khowar reader</small></th><th>WOFF2 served</th></tr></thead><tbody>""")
    for f in fonts:
        r = by_id[f["id"]]
        cov = "complete" if not r["required_missing"] else f"<strong>missing {len(r['required_missing'])}</strong>: {esc(', '.join(r['required_missing']))}"
        sh = r["shaping"]
        shaping = (
            f"{len(sh['notdef'])} .notdef; {len(sh['same_glyph_as_isolated'])} joined contexts identical to isolated"
            + (" (no OpenType GSUB: Graphite only)" if r["graphite_tables"] and not r["ot_language_systems"]["GSUB"] else "")
        )
        add(f"<tr><td>{esc(f['family'])}</td><td>{esc(r['version'])}</td><td>{esc(f['role'])}</td><td>{cov}</td><td>{esc(shaping)}</td>"
            f"<td>See <code>results/{esc(date)}/browser-chromium.json</code></td><td>Pending (section 2 checklist)</td><td>{f['bytes'] / 1024:.0f} KB</td></tr>")
    add("</tbody></table></div>")
    add("<p>Automatic checks prove that glyphs exist and that contextual glyphs are selected. They do <strong>not</strong> prove the "
        "glyphs are correct Khowar letterforms. A red cell means the font lacks that character: whatever appears there comes "
        "from a browser fallback font, not from the font under test.</p>")

    # 1. Letter x form x font matrix
    add('<h2 id="matrix">1. Khowar letters: joining forms by font</h2>')
    add("<p>Forms with ZWJ (U+200D) force the joined shape without a neighbour; “real” forms use beh (ب) as the neighbour. "
        "ݱ joins only on the right (Unicode joining type R), so it has no initial or medial form.</p>")
    for cp in KHOWAR:
        jt = JOINING[cp]
        forms = FORMS_D if jt == "D" else FORMS_R
        add(f'<h3 id="l-{name(cp)}"><span lang="khw" dir="rtl">{chr(cp)}</span> {name(cp)} <span class="tag">joining type {jt}</span> '
            f'<span class="tag">compare: <span lang="ur" dir="rtl">{chr(SUBSTITUTE[cp])}</span> {name(SUBSTITUTE[cp])}</span></h3>')
        for f in fonts:
            miss = name(cp) in missing[f["id"]]
            add(f'<div class="font-row"><div class="font-name">{esc(f["family"])}{" (character not in font)" if miss else ""}</div><div class="cells">')
            for form in forms:
                cls = "cell missing" if miss else "cell"
                add(f'<div class="{cls}"><span class="sp f-{f["id"]}" lang="khw" dir="rtl" data-kind="matrix" data-font="{f["id"]}" '
                    f'data-cp="{name(cp)}" data-form="{form}">{form_text(cp, form)}</span><small>{form.replace("_", " ")}</small></div>')
            add(f'<div class="cell"><span class="sp f-{f["id"]}" lang="ur" dir="rtl" data-kind="compare" data-font="{f["id"]}" '
                f'data-cp="{name(SUBSTITUTE[cp])}">{chr(BEH)}{chr(SUBSTITUTE[cp])}{chr(BEH)}</span><small>compare {name(SUBSTITUTE[cp])}</small></div>')
            add("</div></div>")

    # 2. Review checklist
    add('<h2 id="review">2. Reviewer checklist (fluent Khowar reader)</h2>')
    add("<p>For each letter and font, judge every form in section 1: is it the correct Khowar letter, clearly distinct from its "
        "Urdu-keyboard substitute, with dots and marks in the right place and no collisions? Record the device and browser, then "
        "export and save the JSON as <code>tests/fonts/results/&lt;date&gt;/review-&lt;device&gt;-&lt;browser&gt;.json</code>.</p>")
    add('<form class="review" id="review-form"><p><label>Reviewer <input name="reviewer"></label> '
        '<label>Device <input name="device" placeholder="e.g. Samsung A14"></label> '
        '<label>Browser and version <input name="browser" placeholder="e.g. Samsung Internet 27"></label></p>')
    for f in fonts:
        add(f"<fieldset><legend>{esc(f['family'])}</legend>")
        for cp in KHOWAR:
            key = f"{f['id']}|{name(cp)}"
            add(f'<p><span lang="khw" dir="rtl" class="f-{f["id"]} rtl">{chr(cp)}</span> {name(cp)}: '
                + "".join(f'<label><input type="radio" name="{esc(key)}" value="{v}"> {v}</label>' for v in ("correct", "wrong", "unsure"))
                + f' <label>note <input name="{esc(key)}|note" size="18"></label></p>')
        for item in ("diacritics", "line-height", "mixed-text", "wrapping", "language-tags"):
            key = f"{f['id']}|{item}"
            add(f"<p>{item.replace('-', ' ')} (sections 3–7): "
                + "".join(f'<label><input type="radio" name="{esc(key)}" value="{v}"> {v}</label>' for v in ("ok", "problem", "unsure"))
                + f' <label>note <input name="{esc(key)}|note" size="18"></label></p>')
        add("</fieldset>")
    add('<p><button type="button" id="export">Export review as JSON</button> (needs JavaScript; without it, write results by hand)</p>'
        '<textarea id="export-out" aria-label="Exported review JSON" readonly></textarea></form>')

    # 3. Diacritics
    add('<h2 id="marks">3. Diacritics on Khowar letters</h2>')
    add("<p>Each Khowar letter between behs, carrying each common mark: zabar/zer/pesh, tanween, shadda, sukun, hamza above, "
        "superscript alef.</p>")
    for f in fonts:
        add(f'<h3>{esc(f["family"])}</h3><p class="rtl f-{f["id"]}" lang="khw" dir="rtl" data-kind="marks" data-font="{f["id"]}">')
        add(" ".join(chr(BEH) + chr(cp) + chr(m) + chr(BEH) for cp in KHOWAR for m in MARKS))
        add("</p>")

    # 4. Mixed text and direction
    add('<h2 id="mixed">4. Mixed Khowar / Urdu lines, Latin inside RTL, RTL inside LTR</h2>')
    for f in fonts:
        add(f'<h3>{esc(f["family"])}</h3>'
            f'<p class="rtl f-{f["id"]}" lang="khw" dir="rtl" data-kind="mixed-khw" data-font="{f["id"]}">{mixed_khw}</p>'
            f'<p class="rtl f-{f["id"]}" lang="ur" dir="rtl" data-kind="mixed-ur" data-font="{f["id"]}">{esc(mixed_ur)}</p>'
            f'<p lang="en" dir="ltr">An English sentence containing a Khowar run '
            f'<bdi lang="khw" dir="rtl" class="f-{f["id"]} rtl">{esc(" ".join(seqs[:3]))}</bdi> and the number 2026, which must stay in order.</p>')

    # 5. Wrapping
    add('<h2 id="wrap">5. Long line wrapping (check at 360 px)</h2>')
    for f in fonts:
        add(f'<h3>{esc(f["family"])}</h3><p class="rtl f-{f["id"]}" lang="khw" dir="rtl" data-kind="wrap" data-font="{f["id"]}">{esc(long_line)}</p>')

    # 6. Line height
    add('<h2 id="line-height">6. Line-height comparison (overlap test)</h2>')
    add("<p>Alternating bands show each line box. Look for dots, marks or descenders touching the next or previous line.</p>")
    for f in fonts:
        add(f"<h3>{esc(f['family'])}</h3>")
        for lh in LINE_HEIGHTS:
            cls = "lh-" + lh.replace(".", "-")
            add(f'<p><small>line-height {lh}</small></p><p class="rtl lh {cls} f-{f["id"]}" lang="khw" dir="rtl" data-kind="line-height" '
                f'data-lh="{lh}" data-font="{f["id"]}">{esc(" ".join(seqs[:18]))}</p>')

    # 7. Language tags
    add('<h2 id="language">7. Language tag behaviour (lang="khw" vs "ur" vs "ar")</h2>')
    add("<p>Same characters, different <code>lang</code>. Fonts with Urdu-specific forms (for example Urdu-style digits) may only "
        "apply them under <code>ur</code>. If Khowar should look like Urdu here, Khowar lines may need "
        "<code>font-language-override</code>; that is a D-03 decision.</p>")
    for f in fonts:
        diffs = by_id[f["id"]]["language"].get("khw_vs_ur_differences", [])
        add(f"<h3>{esc(f['family'])}</h3>")
        if diffs:
            add("<p><small>HarfBuzz found differences between ur and khw: " + esc("; ".join(diffs)) + "</small></p>")
        for lang in ("khw", "ur", "ar"):
            add(f'<p><small>lang="{lang}"</small></p><p class="rtl f-{f["id"]}" lang="{lang}" dir="rtl" data-kind="language" '
                f'data-lang="{lang}" data-font="{f["id"]}">{esc(lang_specimen)}</p>')

    add("""<script>
document.getElementById("export").addEventListener("click", () => {
  const data = { exported: new Date().toISOString(), page: "tests/fonts/font-test.html", answers: {} };
  for (const [key, value] of new FormData(document.getElementById("review-form"))) if (value) data.answers[key] = value;
  document.getElementById("export-out").value = JSON.stringify(data, null, 2);
});
</script>
</body>
</html>
""")
    return "\n".join(parts)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=dt.date.today().isoformat())
    args = parser.parse_args()
    fonts = json.loads((FONTS_DIR / "build" / "fonts-built.json").read_text(encoding="utf-8"))
    report = json.loads((FONTS_DIR / "results" / args.date / "font-report.json").read_text(encoding="utf-8"))
    (FONTS_DIR / "font-test.html").write_text(build(fonts, report, args.date), encoding="utf-8", newline="\n")
    print(f"wrote {FONTS_DIR / 'font-test.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
