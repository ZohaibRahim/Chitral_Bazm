// Content collections (PRD v3.1 §5). Any schema violation fails the build.
// Schemas live in src/lib/content/schemas.ts so unit tests can run them without Astro.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { personSchema, slugIdFromFile, songSchema } from "./lib/content/schemas";

const songs = defineCollection({
  loader: glob({
    pattern: "*.{yaml,yml}",
    base: "./src/content/songs",
    generateId: ({ entry, data }) => slugIdFromFile(entry, data),
  }),
  schema: songSchema,
});

const people = defineCollection({
  loader: glob({
    pattern: "*.{yaml,yml}",
    base: "./src/content/people",
    generateId: ({ entry, data }) => slugIdFromFile(entry, data),
  }),
  schema: personSchema,
});

export const collections = { songs, people };
