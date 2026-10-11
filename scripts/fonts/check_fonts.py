"""T-06: font coverage, shaping and subsetting checks (PRD v3.1 §8).

For each font in fonts.json:
  1. Coverage: cmap vs the required and optional code points (khowar_chars.py).
  2. Shaping (HarfBuzz via uharfbuzz): every Khowar/Urdu letter in isolated/initial/medial/final contexts, both with
     ZWJ and with a real neighbour (beh); fails on .notdef (glyph 0); flags contexts where the joined form is the same
     glyph as the isolated form; marks on Khowar letters; language-system behaviour (ur vs khw vs ar).
  3. Subset (all layout features kept), then re-shape the WOFF2 the browser would receive and compare glyph names.
Writes tests/fonts/results/<date>/font-report.json and .md, and the WOFF2 files for tests/fonts/font-test.html.

Automatic checks prove only that glyphs exist and that shaping selects contextual glyphs. They do not prove that the
glyphs are correct Khowar letterforms; that needs review by a fluent Khowar reader (P1-1).

Exit code: 1 if any font is missing a required code point or produces .notdef, else 0.
"""

from __future__ import annotations

import argparse
import datetime as dt
import io
import json
import platform
import sys
from dataclasses import dataclass
from pathlib import Path

import fontTools
import uharfbuzz as hb
from fontTools import subset as ftsubset
from fontTools.pens.hashPointPen import HashPointPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

from khowar_chars import BEH, KHOWAR, MARKS, OPTIONAL, REQUIRED, URDU_LETTERS, ZWJ, ZWNJ, load_joining_types, name, unicode_version

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SOURCES = HERE / "sources"
BUILD = ROOT / "tests" / "fonts" / "build"
SHAPING_DATA = HERE / "data" / "ArabicShaping.txt"


# ---------------------------------------------------------------------------
# Shaping
# ---------------------------------------------------------------------------


@dataclass
class Shaped:
    names: list[str]
    gids: list[int]
    clusters: list[int]
    offsets: list[tuple[int, int]]


class Shaper:
    def __init__(self, data: bytes, glyph_order: list[str]):
        self.font = hb.Font(hb.Face(hb.Blob(data)))
        self.glyph_order = glyph_order
        self._tt = TTFont(io.BytesIO(data))
        self._glyph_set = self._tt.getGlyphSet()
        self._sig: dict[int, str] = {}

    def signature(self, gid: int) -> str:
        """Outline + advance hash, independent of glyph names/ids (used to compare original vs subset)."""
        if gid not in self._sig:
            glyph_name = self._tt.getGlyphName(gid)
            pen = HashPointPen(self._tt["hmtx"][glyph_name][0], self._glyph_set)
            self._glyph_set[glyph_name].drawPoints(pen)
            self._sig[gid] = pen.hash
        return self._sig[gid]

    def shape(self, cps: list[int], language: str | None = "ur") -> Shaped:
        buf = hb.Buffer()
        buf.add_codepoints(cps)
        buf.direction = "rtl"
        buf.script = "Arab"
        # Drop ZWJ/ZWNJ from the output: otherwise HarfBuzz emits them as an invisible glyph in the letter's cluster,
        # which would make an unjoined letter look "different from isolated" (caught by test_check_fonts.py).
        buf.flags = hb.BufferFlags.REMOVE_DEFAULT_IGNORABLES
        if language is not None:
            buf.language = language
        hb.shape(self.font, buf, {})
        gids = [g.codepoint for g in buf.glyph_infos]
        return Shaped(
            names=[self.glyph_order[g] if g < len(self.glyph_order) else f"gid{g}" for g in gids],
            gids=gids,
            clusters=[g.cluster for g in buf.glyph_infos],
            offsets=[(p.x_offset, p.y_offset) for p in buf.glyph_positions],
        )


def target_glyphs(shaped: Shaped, index: int) -> tuple[list[str], bool]:
    """Glyph names produced for the character at `index`; merged=True if it formed a ligature with a neighbour."""
    own = [n for n, c in zip(shaped.names, shaped.clusters) if c == index]
    if own:
        return own, False
    earlier = [c for c in shaped.clusters if c <= index]
    cluster = max(earlier) if earlier else min(shaped.clusters)
    return [n for n, c in zip(shaped.names, shaped.clusters) if c == cluster], True


def contexts(cp: int, joining: str) -> dict[str, tuple[list[int], int]]:
    """Test strings and the index of the letter under test. Forms follow the Unicode joining type."""
    out = {"isolated": ([cp], 0)}
    if joining == "D":
        out |= {
            "initial_zwj": ([cp, ZWJ], 0),
            "medial_zwj": ([ZWJ, cp, ZWJ], 1),
            "final_zwj": ([ZWJ, cp], 1),
            "initial_real": ([cp, BEH], 0),
            "medial_real": ([BEH, cp, BEH], 1),
            "final_real": ([BEH, cp], 1),
        }
    elif joining == "R":
        out |= {"final_zwj": ([ZWJ, cp], 1), "final_real": ([BEH, cp], 1), "zwnj_isolated": ([BEH, ZWNJ, cp], 2)}
    return out


def shaping_tests(shaper: Shaper, cps: list[int], joining: dict[int, str]) -> list[dict]:
    results = []
    for cp in cps:
        jt = joining.get(cp, "U")
        cases = contexts(cp, jt)
        iso_names, _ = target_glyphs(shaper.shape(cases["isolated"][0]), 0)
        for form, (seq, idx) in cases.items():
            shaped = shaper.shape(seq)
            glyphs, merged = target_glyphs(shaped, idx)
            notdef = 0 in shaped.gids
            expects_join = form not in ("isolated", "zwnj_isolated")
            same_as_isolated = expects_join and glyphs == iso_names
            results.append(
                {
                    "cp": name(cp),
                    "char": chr(cp),
                    "joining_type": jt,
                    "form": form,
                    "glyphs": glyphs,
                    "signature": [shaper.signature(g) for g in shaped.gids],
                    "notdef": notdef,
                    "merged_with_neighbour": merged,
                    "same_glyph_as_isolated": same_as_isolated,
                }
            )
    return results


def mark_tests(shaper: Shaper, dotted_circle_gid: int | None) -> list[dict]:
    results = []
    for base in [BEH, *KHOWAR]:
        for mark in MARKS:
            shaped = shaper.shape([BEH, base, mark, BEH] if base != BEH else [base, mark, BEH])
            mark_index = 2 if base != BEH else 1
            mark_offsets = [o for o, c in zip(shaped.offsets, shaped.clusters) if c == mark_index]
            results.append(
                {
                    "base": name(base),
                    "mark": name(mark),
                    "notdef": 0 in shaped.gids,
                    "dotted_circle": dotted_circle_gid is not None and dotted_circle_gid in shaped.gids,
                    "mark_offset_zero": bool(mark_offsets) and all(o == (0, 0) for o in mark_offsets),
                }
            )
    return results


def language_tests(shaper: Shaper) -> dict:
    """Does the language tag change shaping? Specimen: every Khowar and Urdu letter between behs, plus Urdu digits."""
    seq: list[int] = []
    for cp in [*KHOWAR, *URDU_LETTERS]:
        seq += [BEH, cp, BEH, 0x0020]
    seq += list(range(0x06F0, 0x06FA))
    shaped = {lang or "none": shaper.shape(seq, lang) for lang in ("ur", "khw", "ar", None)}
    runs = {k: v.names for k, v in shaped.items()}
    differences = sorted(
        {
            f"{chr(seq[c])} {name(seq[c])}: ur={u} khw={k}"
            for u, k, c in zip(shaped["ur"].names, shaped["khw"].names, shaped["ur"].clusters)
            if u != k and seq[c] != BEH
        }
    )
    return {
        "khw_vs_ur_differences": differences[:40],
        "khw_same_as_ur": runs["khw"] == runs["ur"],
        "ar_same_as_ur": runs["ar"] == runs["ur"],
        "none_same_as_ur": runs["none"] == runs["ur"],
        "khw_differs_glyph_count": sum(1 for a, b in zip(runs["khw"], runs["ur"]) if a != b),
    }


def ot_language_systems(tt: TTFont) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for tag in ("GSUB", "GPOS"):
        if tag not in tt:
            out[tag] = []
            continue
        langs: set[str] = set()
        for rec in tt[tag].table.ScriptList.ScriptRecord:
            if rec.ScriptTag == "arab":
                langs.add("dflt")
                langs.update(lr.LangSysTag.strip() for lr in rec.Script.LangSysRecord)
        out[tag] = sorted(langs)
    return out


# ---------------------------------------------------------------------------
# Subsetting
# ---------------------------------------------------------------------------


def subset_font(tt_bytes: bytes, unicodes: list[int]) -> tuple[bytes, bytes]:
    """Return (ttf, woff2) subsets keeping all layout features and scripts (PRD §8 step 3)."""
    opts = ftsubset.Options()
    opts.layout_features = ["*"]
    opts.layout_scripts = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.glyph_names = True
    opts.notdef_outline = True
    font = TTFont(io.BytesIO(tt_bytes))
    sub = ftsubset.Subsetter(options=opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    ttf = io.BytesIO()
    font.save(ttf)
    font.flavor = "woff2"
    woff2 = io.BytesIO()
    font.save(woff2)
    return ttf.getvalue(), woff2.getvalue()


def woff2_bytes(tt_bytes: bytes) -> bytes:
    font = TTFont(io.BytesIO(tt_bytes))
    font.flavor = "woff2"
    out = io.BytesIO()
    font.save(out)
    return out.getvalue()


def decode_woff2(data: bytes) -> tuple[bytes, list[str]]:
    font = TTFont(io.BytesIO(data))
    font.flavor = None
    out = io.BytesIO()
    font.save(out)
    return out.getvalue(), font.getGlyphOrder()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def check_font(entry: dict, joining: dict[int, str]) -> dict:
    path = SOURCES / entry["id"] / entry["file"]
    raw = path.read_bytes()
    tt = TTFont(io.BytesIO(raw))
    cmap = set(tt.getBestCmap())
    names = tt["name"]
    report: dict = {
        "id": entry["id"],
        "family": entry["family"],
        "role": entry["role"],
        "style": entry["style"],
        "source": entry["source"],
        "license": entry["license"],
        "version": names.getDebugName(5),
        "copyright": names.getDebugName(0),
        "variable": "fvar" in tt,
        "graphite_tables": sorted(t for t in ("Silf", "Glat", "Gloc", "Feat", "Sill") if t in tt),
        "ot_language_systems": ot_language_systems(tt),
    }

    coverage = {}
    for group, cps in {**REQUIRED, **OPTIONAL}.items():
        coverage[group] = {"missing": [f"{name(cp)} {chr(cp)}" for cp in cps if cp not in cmap], "total": len(cps)}
    required_missing = [m for g in REQUIRED for m in coverage[g]["missing"]]
    report["coverage"] = coverage
    report["required_missing"] = required_missing

    shaper = Shaper(raw, tt.getGlyphOrder())
    letters = [*KHOWAR, *URDU_LETTERS]
    shaping = shaping_tests(shaper, letters, joining)
    dotted = tt.getBestCmap().get(0x25CC)
    dotted_gid = tt.getGlyphID(dotted) if dotted else None
    marks = mark_tests(shaper, dotted_gid)
    report["shaping"] = {
        "engine": f"HarfBuzz {hb.version_string()} (uharfbuzz {hb.__version__}), OpenType only (no Graphite)",
        "cases": len(shaping),
        "notdef": [f"{r['cp']} {r['char']} {r['form']}" for r in shaping if r["notdef"]],
        "same_glyph_as_isolated": [f"{r['cp']} {r['char']} {r['form']}" for r in shaping if r["same_glyph_as_isolated"]],
        "merged_with_neighbour": [f"{r['cp']} {r['char']} {r['form']}" for r in shaping if r["merged_with_neighbour"]],
        "khowar_detail": [r for r in shaping if int(r["cp"][2:], 16) in KHOWAR],
    }
    report["marks"] = {
        "cases": len(marks),
        "notdef": [f"{m['base']}+{m['mark']}" for m in marks if m["notdef"]],
        "dotted_circle": [f"{m['base']}+{m['mark']}" for m in marks if m["dotted_circle"]],
        "mark_offset_zero": [f"{m['base']}+{m['mark']}" for m in marks if m["mark_offset_zero"]],
    }
    report["language"] = language_tests(shaper)

    BUILD.mkdir(parents=True, exist_ok=True)
    sizes = {"original_ttf": len(raw)}
    full_woff2 = woff2_bytes(raw)
    sizes["original_woff2"] = len(full_woff2)
    if entry.get("subset"):
        keep = sorted({cp for cps in REQUIRED.values() for cp in cps} | {cp for cps in OPTIONAL.values() for cp in cps}
                      | {0x0020, 0x00A0, ZWJ, ZWNJ})
        sub_ttf, sub_woff2 = subset_font(raw, [cp for cp in keep if cp in cmap or cp in (ZWJ, ZWNJ, 0x0020)])
        sizes["subset_ttf"] = len(sub_ttf)
        sizes["subset_woff2"] = len(sub_woff2)
        if report["variable"]:
            # Measurement only (not served): a single regular weight, as a size option for D-03.
            regular = instancer.instantiateVariableFont(TTFont(io.BytesIO(raw)), {"wght": 400})
            buf = io.BytesIO()
            regular.save(buf)
            sizes["subset_woff2_regular_only"] = len(subset_font(buf.getvalue(), [cp for cp in keep if cp in cmap or cp in (ZWJ, ZWNJ, 0x0020)])[1])
        served = sub_woff2
        decoded, order = decode_woff2(sub_woff2)
        sub_shaping = shaping_tests(Shaper(decoded, order), letters, joining)
        sub_marks = mark_tests(Shaper(decoded, order), None)
        mismatches = [
            f"{a['cp']} {a['form']}: {a['glyphs']} -> {b['glyphs']}"
            for a, b in zip(shaping, sub_shaping)
            if a["signature"] != b["signature"]
        ]
        report["subset"] = {
            "file": f"{entry['id']}.subset.woff2",
            "shaping_identical_to_original": not mismatches,
            "mismatches": mismatches[:50],
            "notdef": [f"{r['cp']} {r['form']}" for r in sub_shaping if r["notdef"]],
            "mark_notdef": [f"{m['base']}+{m['mark']}" for m in sub_marks if m["notdef"]],
        }
    else:
        served = full_woff2
        report["subset"] = {"file": f"{entry['id']}.full.woff2", "skipped_reason": entry.get("_subset_note", "subset: false")}
    (BUILD / report["subset"]["file"]).write_bytes(served)
    report["sizes_bytes"] = sizes
    report["served_file_bytes"] = len(served)

    failed = bool(required_missing or report["shaping"]["notdef"] or report["marks"]["notdef"]
                  or report["subset"].get("notdef") or report["subset"].get("mark_notdef"))
    report["automatic_result"] = "FAIL" if failed else "PASS (automatic checks only; visual review pending)"
    return report


def markdown(report: dict) -> str:
    lines = [
        "# Font report (T-06)",
        "",
        f"Generated {report['generated']} with HarfBuzz {report['tools']['harfbuzz']}, fontTools {report['tools']['fonttools']}, "
        f"Unicode joining data {report['tools']['unicode_arabic_shaping']}.",
        "",
        "**Automatic checks verify Unicode coverage and that HarfBuzz selects glyphs without .notdef. They do not verify that "
        "the glyphs are correct Khowar letterforms, nor how browsers render them. Those need visual review (P1-1).**",
        "",
        "## Summary",
        "",
        "| Font | Version | Role | Required missing | .notdef (shaping) | Joined = isolated | Subset shaping identical | Served WOFF2 | Automatic result |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for f in report["fonts"]:
        sub = f["subset"]
        ident = "n/a (not subset)" if "skipped_reason" in sub else ("yes" if sub["shaping_identical_to_original"] else "**no**")
        lines.append(
            f"| {f['family']} | {f['version']} | {f['role']} | {len(f['required_missing'])}"
            f"{' (' + ', '.join(f['required_missing']) + ')' if f['required_missing'] else ''} | {len(f['shaping']['notdef'])} | "
            f"{len(f['shaping']['same_glyph_as_isolated'])} | {ident} | {f['served_file_bytes'] / 1024:.0f} KB | {f['automatic_result']} |"
        )
    lines += ["", "## Khowar letters by font", ""]
    for f in report["fonts"]:
        lines += [f"### {f['family']}", "", "| Letter | Form | Glyphs | Notes |", "|---|---|---|---|"]
        for r in f["shaping"]["khowar_detail"]:
            notes = []
            if r["notdef"]:
                notes.append("**.notdef**")
            if r["same_glyph_as_isolated"]:
                notes.append("**same glyph as isolated**")
            if r["merged_with_neighbour"]:
                notes.append("ligature with neighbour")
            lines.append(f"| {r['char']} {r['cp']} ({r['joining_type']}) | {r['form']} | {' '.join(r['glyphs'])} | {', '.join(notes)} |")
        lines.append("")
    lines += [
        "## Sizes",
        "",
        "| Font | Original TTF | Original WOFF2 | Subset TTF | Subset WOFF2 (served to the test page) | Subset WOFF2, regular weight only (measured, not served) |",
        "|---|---|---|---|---|---|",
    ]
    for f in report["fonts"]:
        s = f["sizes_bytes"]
        kb = lambda k: f"{s[k] / 1024:.0f} KB" if k in s else "—"  # noqa: E731
        lines.append(f"| {f['family']} | {kb('original_ttf')} | {kb('original_woff2')} | {kb('subset_ttf')} | {kb('subset_woff2')} | {kb('subset_woff2_regular_only')} |")
    lines += ["", "## Language systems and language-tag behaviour", "",
              "| Font | GSUB arab language systems | khw shaped same as ur | ar same as ur | Graphite tables |", "|---|---|---|---|---|"]
    for f in report["fonts"]:
        lang = f["language"]
        lines.append(
            f"| {f['family']} | {', '.join(f['ot_language_systems']['GSUB']) or '—'} | {lang['khw_same_as_ur']} | {lang['ar_same_as_ur']} | "
            f"{', '.join(f['graphite_tables']) or '—'} |"
        )
    for f in report["fonts"]:
        if f["language"]["khw_vs_ur_differences"]:
            lines += ["", f"**{f['family']}: glyphs that differ when text is tagged `khw` instead of `ur`:**", ""]
            lines += [f"- {d}" for d in f["language"]["khw_vs_ur_differences"]]
    lines += ["", "## Marks", "", "| Font | Cases | .notdef | Dotted circle | Mark offset (0,0) |", "|---|---|---|---|---|"]
    for f in report["fonts"]:
        m = f["marks"]
        lines.append(f"| {f['family']} | {m['cases']} | {len(m['notdef'])} | {len(m['dotted_circle'])} | {len(m['mark_offset_zero'])} |")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=dt.date.today().isoformat(), help="results folder name (YYYY-MM-DD)")
    args = parser.parse_args()

    manifest = json.loads((HERE / "fonts.json").read_text(encoding="utf-8"))
    joining = load_joining_types(SHAPING_DATA)
    fonts = []
    for entry in manifest["fonts"]:
        if not (SOURCES / entry["id"] / entry["file"]).exists():
            print(f"missing {entry['id']}: run scripts/fonts/fetch_fonts.py first")
            return 2
        print(f"checking {entry['family']} ...")
        fonts.append(check_font(entry, joining))

    report = {
        "generated": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "tools": {
            "harfbuzz": hb.version_string(),
            "uharfbuzz": hb.__version__,
            "fonttools": fontTools.version,
            "python": platform.python_version(),
            "unicode_arabic_shaping": unicode_version(SHAPING_DATA),
        },
        "required": {g: [name(c) for c in cps] for g, cps in REQUIRED.items()},
        "optional": {g: [name(c) for c in cps] for g, cps in OPTIONAL.items()},
        "fonts": fonts,
    }
    out = ROOT / "tests" / "fonts" / "results" / args.date
    out.mkdir(parents=True, exist_ok=True)
    (out / "font-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out / "font-report.md").write_text(markdown(report), encoding="utf-8")
    (BUILD / "fonts-built.json").write_text(
        json.dumps([{"id": f["id"], "family": f["family"], "file": f["subset"]["file"], "bytes": f["served_file_bytes"],
                     "version": f["version"], "role": f["role"]} for f in fonts], indent=2) + "\n",
        encoding="utf-8",
    )

    failed = [f["family"] for f in fonts if f["automatic_result"] == "FAIL"]
    for f in fonts:
        print(f"  {f['family']}: {f['automatic_result']}; required missing: {f['required_missing'] or 'none'}; "
              f".notdef: {len(f['shaping']['notdef'])}; joined==isolated: {len(f['shaping']['same_glyph_as_isolated'])}")
    print(f"report: {out / 'font-report.md'}")
    if failed:
        print(f"FAIL: {', '.join(failed)} missing required glyphs or produced .notdef")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
