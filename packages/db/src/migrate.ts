import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set explicitly to run migrations. Refusing to use the localhost fallback."
    );
  }

  const { pool } = await import("./client");
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
  const { pool } = await import("./client");
  await pool.end();
  process.exit(1);
});
