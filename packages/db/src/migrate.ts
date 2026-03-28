import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { pool } from "./client";

async function main() {
  const drizzleDir = join(process.cwd(), "drizzle");
  const files = (await readdir(drizzleDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const file of files) {
    const sql = await readFile(join(drizzleDir, file), "utf8");
    await pool.query(sql);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
