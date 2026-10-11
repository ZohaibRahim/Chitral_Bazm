// Build-time only. Reads people YAML the same way Astro's loader does, so song credits can be checked against
// people during content sync (Astro's reference() does not check that an entry exists).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument } from "yaml";
import { personSchema, type Person } from "./schemas";

export function loadPeopleFromDisk(dir: string): Map<string, Person> {
  const people = new Map<string, Person>();
  if (!existsSync(dir)) return people;
  for (const file of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const doc = parseDocument(readFileSync(join(dir, file), "utf8"), { customTags: ["timestamp"], merge: true, schema: "core" });
    // Invalid person files are reported by the people collection itself; here they simply do not resolve.
    const parsed = personSchema.safeParse(doc.errors.length > 0 ? undefined : doc.toJS());
    if (parsed.success) people.set(parsed.data.slug, parsed.data);
  }
  return people;
}
