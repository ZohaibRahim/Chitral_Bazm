// Build tests run real `astro build`s, so they are slow and must not run in parallel (shared .astro cache).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/build/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 180_000,
  },
});
