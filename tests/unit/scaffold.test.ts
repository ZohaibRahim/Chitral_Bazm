// T-01: guards the scaffold settings the PRD depends on.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import astroConfig from "../../astro.config.mjs";

const readJson = (path: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")) as Record<string, unknown>;

describe("scaffold", () => {
  it("uses Astro's strictest TypeScript preset", () => {
    expect(readJson("tsconfig.json")["extends"]).toBe("astro/tsconfigs/strictest");
  });

  it("builds static output only (PRD §4)", () => {
    expect(astroConfig.output).toBe("static");
  });

  it("registers the React integration for islands", () => {
    const names = (astroConfig.integrations ?? []).flat().map((i) => (i && "name" in i ? i.name : ""));
    expect(names).toContain("@astrojs/react");
  });

  it("production builds clear the content cache so credits are re-checked when only people change (T-03)", () => {
    const scripts = readJson("package.json")["scripts"] as Record<string, string>;
    expect(scripts["build"]).toMatch(/astro build .*--force/);
  });

  it("defines the build, test and e2e scripts required by T-01", () => {
    const scripts = readJson("package.json")["scripts"] as Record<string, string>;
    for (const name of ["build", "typecheck", "test", "e2e", "lhci"]) {
      expect(scripts[name], `missing script: ${name}`).toBeTruthy();
    }
  });
});
