// Reads YAML fixtures exactly as Astro's content loader does
// (@astrojs/internal-helpers/yaml: yaml package, core schema, timestamp tag, merge keys).
import { readdirSync, readFileSync } from "node:fs";
import { parseDocument } from "yaml";

export const FIXTURES = new URL("../../fixtures/", import.meta.url);

export function readYamlFixture(relativePath: string): unknown {
  const source = readFileSync(new URL(relativePath, FIXTURES), "utf8");
  const doc = parseDocument(source, { customTags: ["timestamp"], merge: true, schema: "core" });
  if (doc.errors.length > 0) throw doc.errors[0];
  return doc.toJS();
}

export function listFixtures(dir: string): string[] {
  return readdirSync(new URL(`${dir}/`, FIXTURES)).filter((f) => /\.ya?ml$/.test(f)).sort();
}
