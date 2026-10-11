// Runs the project venv's Python (Windows or POSIX layout) so npm scripts work on any OS.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const candidates = [`${root}.venv/Scripts/python.exe`, `${root}.venv/bin/python`];
const python = candidates.find((p) => existsSync(p));
if (!python) {
  console.error("No project venv. Run: python -m venv .venv && .venv/Scripts/python -m pip install -r scripts/fonts/requirements.txt");
  process.exit(2);
}
const result = spawnSync(python, process.argv.slice(2), { stdio: "inherit", cwd: root });
process.exit(result.status ?? 1);
