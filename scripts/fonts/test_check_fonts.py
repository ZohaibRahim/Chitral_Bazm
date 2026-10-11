"""Self-tests for the T-06 font tooling: the checks must be able to fail.

Run: .venv/Scripts/python -m unittest discover -s scripts/fonts -p "test_*.py"
"""

from __future__ import annotations

import unittest
from pathlib import Path

from check_fonts import SHAPING_DATA, SOURCES, Shaped, Shaper, contexts, shaping_tests, subset_font, target_glyphs
from fontTools.ttLib import TTFont
from khowar_chars import BEH, KHOWAR, ZWJ, load_joining_types

NASKH = SOURCES / "noto-naskh-arabic" / "NotoNaskhArabic[wght].ttf"


def shaper_for(path: Path) -> Shaper:
    data = path.read_bytes()
    return Shaper(data, TTFont(path).getGlyphOrder())


class JoiningTypes(unittest.TestCase):
    def test_khowar_letters_follow_unicode(self) -> None:
        jt = load_joining_types(SHAPING_DATA)
        self.assertEqual(jt[0x0771], "R")  # ݱ joins on the right only
        for cp in (0x076E, 0x076F, 0x0770, 0x0681, 0x0685):
            self.assertEqual(jt[cp], "D", hex(cp))

    def test_contexts_match_joining_type(self) -> None:
        self.assertEqual(set(contexts(0x0770, "D")), {"isolated", "initial_zwj", "medial_zwj", "final_zwj", "initial_real", "medial_real", "final_real"})
        self.assertEqual(set(contexts(0x0771, "R")), {"isolated", "final_zwj", "final_real", "zwnj_isolated"})
        self.assertEqual(contexts(0x0770, "D")["medial_real"], ([BEH, 0x0770, BEH], 1))


class TargetGlyphs(unittest.TestCase):
    def test_reports_ligature_with_neighbour(self) -> None:
        shaped = Shaped(names=["lig", "beh"], gids=[5, 6], clusters=[0, 2], offsets=[(0, 0), (0, 0)])
        self.assertEqual(target_glyphs(shaped, 1), (["lig"], True))
        self.assertEqual(target_glyphs(shaped, 2), (["beh"], False))


@unittest.skipUnless(NASKH.exists(), "run fetch_fonts.py first")
class AgainstARealFont(unittest.TestCase):
    def test_detects_notdef_for_an_unmapped_character(self) -> None:
        shaped = shaper_for(NASKH).shape([0x4E00])  # CJK ideograph: not in an Arabic font
        self.assertIn(0, shaped.gids)

    def test_detects_missing_joined_form(self) -> None:
        # U+0627 alef is right-joining: tested as if dual-joining, its "initial" form must equal the isolated glyph.
        results = shaping_tests(shaper_for(NASKH), [0x0627], {0x0627: "D"})
        initial = next(r for r in results if r["form"] == "initial_zwj")
        self.assertTrue(initial["same_glyph_as_isolated"])

    def test_khowar_letters_have_contextual_forms(self) -> None:
        jt = load_joining_types(SHAPING_DATA)
        results = shaping_tests(shaper_for(NASKH), KHOWAR, jt)
        self.assertFalse([r for r in results if r["notdef"] or r["same_glyph_as_isolated"]])

    def test_subset_keeps_shaping_and_detects_a_broken_subset(self) -> None:
        raw = NASKH.read_bytes()
        original = shaper_for(NASKH)
        good_ttf, _ = subset_font(raw, [BEH, 0x0770, ZWJ])
        good = Shaper(good_ttf, TTFont(__import__("io").BytesIO(good_ttf)).getGlyphOrder())
        seq = [BEH, 0x0770, BEH]
        sig = lambda s: [s.signature(g) for g in s.shape(seq).gids]  # noqa: E731
        self.assertEqual(sig(original), sig(good))
        # A subset without ݰ cannot reproduce the shaping.
        bad_ttf, _ = subset_font(raw, [BEH])
        bad = Shaper(bad_ttf, TTFont(__import__("io").BytesIO(bad_ttf)).getGlyphOrder())
        self.assertNotEqual(sig(original), sig(bad))
        self.assertIn(0, bad.shape(seq).gids)


if __name__ == "__main__":
    unittest.main()
