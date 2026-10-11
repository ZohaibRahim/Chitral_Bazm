// Splits RTL text into runs so embedded Latin names and numbers can be isolated with <bdi dir="ltr"> (PRD §8).
// Never changes the text: joining the runs returns the input exactly (same code points, same logical order).

export type Run = { text: string; ltr: boolean };

// A Latin/ASCII-digit run: starts with a letter or digit, may continue with letters, digits, apostrophes, periods,
// hyphens, and spaces that are followed by more Latin.
const LATIN_RUN = /[A-Za-z0-9](?:[A-Za-z0-9'’.\-]|\s+(?=[A-Za-z0-9]))*/g;

export function directionalRuns(text: string): Run[] {
  const runs: Run[] = [];
  let last = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    const start = match.index;
    if (start > last) runs.push({ text: text.slice(last, start), ltr: false });
    runs.push({ text: match[0], ltr: true });
    last = start + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), ltr: false });
  return runs;
}
