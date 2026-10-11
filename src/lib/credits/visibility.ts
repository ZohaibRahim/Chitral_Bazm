// Credit visibility and consent rules (PRD v3.1 §7). Used wherever a credit is displayed:
// song pages, structured data and search (only visible names are indexed, PRD §9).
import type { Credit, Person, PersonCredit } from "../content/schemas";

export type CreditDisplay =
  | { kind: "traditional"; role: Credit["role"]; label: "Traditional" }
  | { kind: "named"; role: Credit["role"]; name: string; nameKhwArab?: string }
  | { kind: "initials"; role: Credit["role"]; initials: string }
  | { kind: "withheld"; role: Credit["role"] };

export type PeopleBySlug = ReadonlyMap<string, Person>;

/** Consistency problems between a credit and the person it names. Empty means the record is valid. */
export function creditIssues(credit: Credit, people: PeopleBySlug): string[] {
  if (credit.traditional) return [];
  const person = people.get(credit.person);
  if (person === undefined) {
    return [`credit "${credit.role}" names unknown person "${credit.person}" (no src/content/people/${credit.person}.yaml)`];
  }
  const issues: string[] = [];
  // Rule 1: own_choice is a living adult's recorded choice.
  if (credit.visibility_basis === "own_choice") {
    if (person.is_living === false) {
      issues.push(`"${person.slug}" is deceased; use family_choice or official_release_credit instead of own_choice (PRD §7 rules 1, 3)`);
    }
    if (person.is_minor === true) {
      issues.push(`"${person.slug}" is under 18; own_choice cannot authorize a named credit (PRD §7 rule 6)`);
    }
  }
  // Rule 3: family_choice applies to deceased persons.
  if (credit.visibility_basis === "family_choice" && person.is_living !== false) {
    issues.push(`family_choice is only for deceased persons; "${person.slug}" is not recorded as deceased (PRD §7 rule 3)`);
  }
  return issues;
}

/** Throws with every problem listed, so a build that renders credits fails on inconsistent records. */
export function assertValidCredits(credits: readonly Credit[], people: PeopleBySlug, context: string): void {
  const problems = credits.flatMap((c) => creditIssues(c, people));
  if (problems.length > 0) {
    throw new Error(`${context}: invalid credits\n- ${problems.join("\n- ")}`);
  }
}

/** Latin initials from a display name, e.g. "Ali Khan" -> "A. K." */
export function initialsOf(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map((word) => `${[...word][0]?.toLocaleUpperCase("en") ?? ""}.`)
    .join(" ");
}

/**
 * How a credit is shown publicly (PRD §7).
 * - Rule 7: traditional credits always read "Traditional".
 * - Rule 6: under-18s are never named. The schema has no guardian-consent record yet, so minors are always withheld.
 * - Rules 2 and 8: default_withheld is always withheld.
 * - Rules 1-3: otherwise the recorded visibility (own choice, family choice, or the official release credit) applies.
 * Throws on inconsistent records rather than guessing.
 */
export function resolveCreditDisplay(credit: Credit, people: PeopleBySlug): CreditDisplay {
  if (credit.traditional) return { kind: "traditional", role: credit.role, label: "Traditional" };

  const issues = creditIssues(credit, people);
  if (issues.length > 0) throw new Error(issues.join("; "));
  const person = people.get(credit.person) as Person;

  if (person.is_minor === true) return { kind: "withheld", role: credit.role };
  return displayFor(credit, person);
}

function displayFor(credit: PersonCredit, person: Person): CreditDisplay {
  if (credit.visibility_basis === "default_withheld") return { kind: "withheld", role: credit.role };
  switch (credit.visibility) {
    case "public": {
      const named: CreditDisplay = { kind: "named", role: credit.role, name: person.display_name };
      if (person.name_khw_arab !== undefined) named.nameKhwArab = person.name_khw_arab;
      return named;
    }
    case "initials":
      return { kind: "initials", role: credit.role, initials: initialsOf(person.display_name) };
    case "withheld":
      return { kind: "withheld", role: credit.role };
  }
}
