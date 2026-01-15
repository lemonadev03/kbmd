import { Pool } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS drizzle;
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    // Get all migration files
    const drizzleDir = join(process.cwd(), "drizzle");
    const migrationFiles = readdirSync(drizzleDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    
    console.log(`Found ${migrationFiles.length} migration files\n`);

    for (const migrationName of migrationFiles) {
      console.log(`Running migration: ${migrationName}`);

      // Check if migration already ran
      const checkResult = await client.query(
        `SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = $1`,
        [migrationName]
      );

      if (checkResult.rows.length > 0) {
        console.log(`  ⏭️  Already applied, skipping\n`);
        continue;
      }

      // Read and execute migration
      const filePath = join(drizzleDir, migrationName);
      const sql = readFileSync(filePath, "utf-8");
      
      // Split by statement-breakpoint and execute each statement
      const statements = sql
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }

      // Record migration
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [migrationName, Date.now()]
      );

      console.log(`  ✅ Applied successfully\n`);
    }

    console.log("✅ All migrations completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error(error);
  process.exit(1);
});
