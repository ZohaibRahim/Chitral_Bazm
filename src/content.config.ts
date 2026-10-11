// Content collections (PRD v3.1 §5). Any schema violation fails the build.
// Schemas live in src/lib/content/schemas.ts so unit tests can run them without Astro.
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { loadPeopleFromDisk } from "./lib/content/people-on-disk";
import { personSchema, slugIdFromFile, songSchema } from "./lib/content/schemas";
import { creditIssues } from "./lib/credits/visibility";

// KLA_CONTENT_ROOT exists only for the negative build tests (tests/build/), which point it at temporary content.
const CONTENT_ROOT = process.env["KLA_CONTENT_ROOT"] ?? fileURLToPath(new URL("./content/", import.meta.url));
const SONGS_DIR = join(CONTENT_ROOT, "songs");
const PEOPLE_DIR = join(CONTENT_ROOT, "people");

// Every song's credits must resolve to a person and match their recorded status (PRD §7), in every build.
const songWithCreditReferences = songSchema.superRefine((song, ctx) => {
  const people = loadPeopleFromDisk(PEOPLE_DIR);
  song.credits.forEach((credit, i) => {
    for (const message of creditIssues(credit, people)) {
      ctx.addIssue({ code: "custom", path: ["credits", i], message });
    }
  });
});

const songs = defineCollection({
  loader: glob({
    pattern: "*.{yaml,yml}",
    base: pathToFileURL(`${SONGS_DIR}/`),
    generateId: ({ entry, data }) => slugIdFromFile(entry, data),
  }),
  schema: songWithCreditReferences,
});

const people = defineCollection({
  loader: glob({
    pattern: "*.{yaml,yml}",
    base: pathToFileURL(`${PEOPLE_DIR}/`),
    generateId: ({ entry, data }) => slugIdFromFile(entry, data),
  }),
  schema: personSchema,
});

export const collections = { songs, people };
