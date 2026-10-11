// T-04: credit visibility and consent (PRD v3.1 §7). One case per rule.
import { describe, expect, it } from "vitest";
import type { Credit, Person } from "../../src/lib/content/schemas";
import { creditSchema } from "../../src/lib/content/schemas";
import { assertValidCredits, initialsOf, resolveCreditDisplay } from "../../src/lib/credits/visibility";

const people = new Map<string, Person>([
  ["living-one", { slug: "living-one", display_name: "Living One", name_khw_arab: "[ݰ]", is_living: true }],
  ["unknown-status", { slug: "unknown-status", display_name: "Unknown Status" }],
  ["deceased-one", { slug: "deceased-one", display_name: "Deceased One", is_living: false, death_year: 1980 }],
  ["minor-one", { slug: "minor-one", display_name: "Minor One", is_living: true, is_minor: true }],
]);

const credit = (input: Record<string, unknown>): Credit => creditSchema.parse({ role: "singer", ...input });
const recorded = { recorded_on: "2026-10-11" };

describe("rule 1: a living adult's own choice governs", () => {
  it("public -> full name (with Khowar name when recorded)", () => {
    const c = credit({ person: "living-one", visibility: "public", visibility_basis: "own_choice", ...recorded });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "named", role: "singer", name: "Living One", nameKhwArab: "[ݰ]" });
  });

  it("initials -> initials only", () => {
    const c = credit({ person: "living-one", visibility: "initials", visibility_basis: "own_choice", ...recorded });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "initials", role: "singer", initials: "L. O." });
  });

  it("withheld -> no name", () => {
    const c = credit({ person: "living-one", visibility: "withheld", visibility_basis: "own_choice", ...recorded });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "withheld", role: "singer" });
  });

  it("own_choice for a deceased person is rejected", () => {
    const c = credit({ person: "deceased-one", visibility: "public", visibility_basis: "own_choice", ...recorded });
    expect(() => resolveCreditDisplay(c, people)).toThrow(/deceased/);
  });
});

describe("rule 2: without a recorded choice, only the official release credit may name a living person", () => {
  it("official_release_credit -> name as released", () => {
    const c = credit({ person: "unknown-status", visibility: "public", visibility_basis: "official_release_credit" });
    expect(resolveCreditDisplay(c, people)).toMatchObject({ kind: "named", name: "Unknown Status" });
  });

  it("default_withheld -> withheld", () => {
    const c = credit({ person: "living-one", visibility: "withheld", visibility_basis: "default_withheld" });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "withheld", role: "singer" });
  });
});

describe("rule 3: deceased persons follow the family's recorded choice", () => {
  it("family_choice for a deceased person -> as chosen", () => {
    const c = credit({ person: "deceased-one", visibility: "initials", visibility_basis: "family_choice", ...recorded });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "initials", role: "singer", initials: "D. O." });
  });

  it("family_choice for someone not recorded as deceased is rejected", () => {
    const c = credit({ person: "living-one", visibility: "public", visibility_basis: "family_choice", ...recorded });
    expect(() => resolveCreditDisplay(c, people)).toThrow(/only for deceased/);
  });
});

describe("rule 6: under-18s are never named without guardian consent", () => {
  it("a minor's official release credit is still withheld", () => {
    const c = credit({ person: "minor-one", visibility: "public", visibility_basis: "official_release_credit" });
    expect(resolveCreditDisplay(c, people)).toEqual({ kind: "withheld", role: "singer" });
  });

  it("a minor's own choice cannot authorize a named credit", () => {
    const c = credit({ person: "minor-one", visibility: "public", visibility_basis: "own_choice", ...recorded });
    expect(() => resolveCreditDisplay(c, people)).toThrow(/under 18/);
  });
});

describe("rule 7: traditional credits", () => {
  it("always display as Traditional", () => {
    expect(resolveCreditDisplay(credit({ traditional: true }), people)).toEqual({
      kind: "traditional",
      role: "singer",
      label: "Traditional",
    });
  });
});

describe("rule 8: public or initials need a recorded basis (schema level)", () => {
  it("rejects initials with default_withheld", () => {
    const result = creditSchema.safeParse({ role: "singer", person: "living-one", visibility: "initials", visibility_basis: "default_withheld" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/rule 8/);
  });
});

describe("record consistency", () => {
  it("rejects a credit naming an unknown person", () => {
    const c = credit({ person: "nobody", visibility: "withheld", visibility_basis: "default_withheld" });
    expect(() => resolveCreditDisplay(c, people)).toThrow(/unknown person "nobody"/);
  });

  it("assertValidCredits lists every problem with context", () => {
    const credits = [
      credit({ person: "nobody", visibility: "withheld", visibility_basis: "default_withheld" }),
      credit({ role: "lyricist", person: "living-one", visibility: "public", visibility_basis: "family_choice", ...recorded }),
    ];
    expect(() => assertValidCredits(credits, people, "songs/test")).toThrow(/songs\/test: invalid credits\n- .*nobody.*\n- .*only for deceased/);
  });

  it("initialsOf handles extra whitespace", () => {
    expect(initialsOf("  ali   khan ")).toBe("A. K.");
  });
});
