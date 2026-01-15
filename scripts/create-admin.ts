import { Pool } from "pg";
import { randomBytes, scryptSync, randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// BetterAuth uses scrypt for password hashing
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  }).toString("hex");
  return `${salt}:${hash}`;
}

async function createAdmin() {
  const client = await pool.connect();

  const email = "admin@fma.com";
  const password = "admin123"; // Change this to your desired password
  const name = "Admin";
  let userId = randomUUID();

  try {
    console.log(`Creating admin user: ${email}`);

    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      console.log("ℹ️ User already exists with ID:", userId);
    } else {
      // Hash the password
      const hashedPassword = hashPassword(password);

      // Insert user (using snake_case column names)
      await client.query(
        `INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, name, email, true, null]
      );

      // Insert account (credential type for email/password)
      await client.query(
        `INSERT INTO "account" (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          randomUUID(),
          userId,
          "credential",
          userId,
          null,
          null,
          null,
          null,
          null,
          null,
          hashedPassword,
        ]
      );
    }

    const orgSlug = "fma";
    const orgName = "FMA";
    const orgResult = await client.query(
      'SELECT id FROM "organizations" WHERE slug = $1',
      [orgSlug]
    );
    let orgId = orgResult.rows[0]?.id as string | undefined;

    if (!orgId) {
      orgId = randomUUID();
      await client.query(
        `INSERT INTO "organizations" (id, name, slug, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [orgId, orgName, orgSlug]
      );
    }

    await client.query(
      `INSERT INTO "org_memberships" (org_id, user_id, role, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      [orgId, userId, "admin"]
    );

    await client.query(
      `INSERT INTO "user_settings" (user_id, last_org_id, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET last_org_id = EXCLUDED.last_org_id, updated_at = NOW()`,
      [userId, orgId]
    );

    console.log("✅ Admin user ready!");
    console.log("User ID:", userId);
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Org:", orgName, `(${orgSlug})`);
    console.log("\n⚠️  Please change the password after first login!");
  } catch (error) {
    console.error("Error creating admin:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();
