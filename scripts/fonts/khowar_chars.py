"""Character sets for Khowar font testing (PRD v3.1 §8). Code points only; no words or lyrics."""

from __future__ import annotations

from pathlib import Path

# Khowar-specific letters named in PRD §3/§8.
KHOWAR = [0x076E, 0x076F, 0x0770, 0x0771, 0x0681, 0x0685]

# Urdu alphabet as used in Khowar/Urdu text (Perso-Arabic, Urdu orthography).
URDU_LETTERS = [
    0x0627, 0x0622, 0x0628, 0x067E, 0x062A, 0x0679, 0x062B, 0x062C, 0x0686, 0x062D, 0x062E, 0x062F, 0x0688,
    0x0630, 0x0631, 0x0691, 0x0632, 0x0698, 0x0633, 0x0634, 0x0635, 0x0636, 0x0637, 0x0638, 0x0639, 0x063A,
    0x0641, 0x0642, 0x06A9, 0x06AF, 0x0644, 0x0645, 0x0646, 0x06BA, 0x0648, 0x06C1, 0x06BE, 0x0621, 0x06CC,
    0x06D2, 0x0626, 0x0624, 0x0623, 0x06C2, 0x06C3, 0x06D3,
]

# Common diacritics: fathatan..sukun, hamza above, superscript alef.
MARKS = [0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x0651, 0x0652, 0x0654, 0x0670]

# Urdu punctuation and Extended Arabic-Indic (Urdu) digits.
PUNCTUATION = [0x060C, 0x061B, 0x061F, 0x06D4]
URDU_DIGITS = list(range(0x06F0, 0x06FA))

REQUIRED = {
    "khowar_letters": KHOWAR,
    "urdu_letters": URDU_LETTERS,
    "marks": MARKS,
    "punctuation": PUNCTUATION,
    "urdu_digits": URDU_DIGITS,
}

# Reported but not required: Arabic-keyboard variants users may type (folded by search, PRD §9),
# Arabic-Indic digits, tatweel and the dotted circle used for broken-cluster display.
OPTIONAL = {
    "arabic_input_variants": [0x064A, 0x0649, 0x0643, 0x0647, 0x0629, 0x0625, 0x0671, 0x06AA, 0x06D5],
    "arabic_indic_digits": list(range(0x0660, 0x066A)),
    "tatweel": [0x0640],
    "dotted_circle": [0x25CC],
}

BEH = 0x0628  # dual-joining neighbour used for real-letter contexts
ZWJ = 0x200D
ZWNJ = 0x200C


def load_joining_types(path: Path) -> dict[int, str]:
    """Joining type per code point from Unicode ArabicShaping.txt (D, R, U, T, C, L)."""
    types: dict[int, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        fields = [f.strip() for f in line.split(";")]
        types[int(fields[0], 16)] = fields[2]
    return types


def unicode_version(path: Path) -> str:
    first = path.read_text(encoding="utf-8").splitlines()[0]
    return first.removeprefix("# ArabicShaping-").removesuffix(".txt")


def name(cp: int) -> str:
    return f"U+{cp:04X}"
