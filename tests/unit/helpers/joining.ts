// Positional (joining) forms per Unicode ArabicShaping.txt, the same data the T-06 font checker uses.
import { readFileSync } from "node:fs";

const DATA = new URL("../../../scripts/fonts/data/ArabicShaping.txt", import.meta.url);

const JOINING = new Map<number, string>();
for (const raw of readFileSync(DATA, "utf8").split("\n")) {
  const line = raw.split("#")[0]?.trim();
  if (!line) continue;
  const [cp, , type] = line.split(";").map((f) => f.trim());
  if (cp && type) JOINING.set(Number.parseInt(cp, 16), type);
}

/** Unicode joining type; unlisted marks and format characters are transparent (T), everything else U. */
export function joiningType(ch: string): string {
  const cp = ch.codePointAt(0) ?? 0;
  return JOINING.get(cp) ?? (/[\p{Mn}\p{Me}\p{Cf}]/u.test(ch) ? "T" : "U");
}

export type Form = "isolated" | "initial" | "medial" | "final";

/** The positional form of every joining letter in `text`, in logical order. */
export function positionalForms(text: string): { ch: string; form: Form }[] {
  const chars = [...text];
  const neighbour = (from: number, step: number) => {
    for (let i = from + step; i >= 0 && i < chars.length; i += step) {
      const c = chars[i] ?? "";
      if (joiningType(c) !== "T") return c;
    }
    return undefined;
  };
  const out: { ch: string; form: Form }[] = [];
  chars.forEach((ch, i) => {
    const t = joiningType(ch);
    if (t !== "D" && t !== "R") return;
    const prev = neighbour(i, -1);
    const next = neighbour(i, 1);
    const joinsPrev = prev !== undefined && ["D", "L", "C"].includes(joiningType(prev));
    const joinsNext = t === "D" && next !== undefined && ["D", "R", "C"].includes(joiningType(next));
    out.push({ ch, form: joinsPrev && joinsNext ? "medial" : joinsPrev ? "final" : joinsNext ? "initial" : "isolated" });
  });
  return out;
}
