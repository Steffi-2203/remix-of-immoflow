import fs from "fs";
import path from "path";
import { runMigrations } from "./runner";

const IGNORED_FILES = new Set(["index.ts", "runner.ts", "run-migration.cjs"]);

async function discoverAndRun() {
  const dir = path.dirname(new URL(import.meta.url).pathname);
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".ts") && !IGNORED_FILES.has(f))
    .sort();

  interface Migration { name: string; up: string; down: string; }
  const migrations: Migration[] = [];
  for (const file of files) {
    const mod = await import(path.join(dir, file));
    const migration = mod.default;
    if (migration && typeof migration === "object" && migration.name && migration.up && migration.down) {
      migrations.push(migration as Migration);
    } else {
      console.log(`[MigrationIndex] Skipping ${file} (no default { name, up, down } export)`);
    }
  }

  if (migrations.length === 0) {
    console.log("[MigrationIndex] No transactional migrations found");
    return;
  }

  console.log(`[MigrationIndex] Discovered ${migrations.length} migration(s): ${migrations.map(m => m.name).join(", ")}`);

  const direction = process.argv.includes("--down") ? "down" as const : "up" as const;
  await runMigrations(migrations, direction);
}

discoverAndRun()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[MigrationIndex] Fatal:", err);
    process.exit(1);
  });
