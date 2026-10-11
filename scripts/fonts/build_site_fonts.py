"""Build the site's Khowar webfont into public/fonts/ (T-08). PROVISIONAL: D-03 is open.

Noto Nastaliq Urdu, instanced to the regular weight (wght=400), subset to the Khowar/Urdu set with every layout
feature kept. Shaping of every required letter in every joining context is re-checked against the full font;
the build fails on any difference or .notdef. The OFL licence is copied next to the font.
"""

from __future__ import annotations

import io
import json
import shutil
import sys
from pathlib import Path

from check_fonts import SHAPING_DATA, SOURCES, Shaper, decode_woff2, shaping_tests, subset_font
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from khowar_chars import KHOWAR, OPTIONAL, REQUIRED, URDU_LETTERS, ZWJ, ZWNJ, load_joining_types

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent.parent / "public" / "fonts"
FONT_ID = "noto-nastaliq-urdu"


def main() -> int:
    manifest = {f["id"]: f for f in json.loads((HERE / "fonts.json").read_text(encoding="utf-8"))["fonts"]}
    entry = manifest[FONT_ID]
    src = SOURCES / FONT_ID / entry["file"]
    if not src.exists():
        print("run npm run fonts:fetch first")
        return 2

    regular = instancer.instantiateVariableFont(TTFont(src), {"wght": 400})
    buf = io.BytesIO()
    regular.save(buf)
    regular_bytes = buf.getvalue()
    version = TTFont(io.BytesIO(regular_bytes))["name"].getDebugName(5).split()[-1]

    cmap = set(TTFont(io.BytesIO(regular_bytes)).getBestCmap())
    keep = {cp for cps in REQUIRED.values() for cp in cps} | {cp for cps in OPTIONAL.values() for cp in cps}
    unicodes = sorted(cp for cp in keep if cp in cmap) + [ZWJ, ZWNJ]
    _, woff2 = subset_font(regular_bytes, unicodes)

    joining = load_joining_types(SHAPING_DATA)
    letters = [*KHOWAR, *URDU_LETTERS]
    before = shaping_tests(Shaper(regular_bytes, TTFont(io.BytesIO(regular_bytes)).getGlyphOrder()), letters, joining)
    decoded, order = decode_woff2(woff2)
    after = shaping_tests(Shaper(decoded, order), letters, joining)
    problems = [f"{a['cp']} {a['form']}" for a, b in zip(before, after) if a["signature"] != b["signature"] or b["notdef"]]
    if problems:
        print("FAIL: subset changed shaping:", problems[:20])
        return 1

    PUBLIC.mkdir(parents=True, exist_ok=True)
    name = f"{FONT_ID}-v{version}-regular.woff2"
    for old in PUBLIC.glob(f"{FONT_ID}-v*.woff2"):
        old.unlink()
    (PUBLIC / name).write_bytes(woff2)
    shutil.copyfile(SOURCES / FONT_ID / "OFL.txt", PUBLIC / "OFL-noto-nastaliq-urdu.txt")
    (PUBLIC / "fonts.json").write_text(
        json.dumps({"khowar": {"family": entry["family"], "version": version, "file": name, "bytes": len(woff2),
                               "license": "OFL-1.1", "status": "provisional (D-03 open)"}}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote public/fonts/{name} ({len(woff2) / 1024:.0f} KB); shaping identical for {len(before)} cases")
    return 0


if __name__ == "__main__":
    sys.exit(main())
