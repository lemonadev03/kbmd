import { Pool } from "pg";
import { randomBytes, scryptSync, randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type SeedUser = {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
};

const orgSlug = "fma";
const orgName = "FMA";

const users: SeedUser[] = [
  { email: "mark@kbmd.com", password: "mark123", name: "Mark", role: "admin" },
  { email: "lesmon@kbmd.com", password: "lesmon123", name: "Lesmon", role: "admin" },
  { email: "darla@kbmd.com", password: "darla123", name: "Darla", role: "admin" },
];

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

async function ensureOrg(client: ReturnType<typeof pool.connect>) {
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

  return orgId;
}

async function ensureUser(
  client: ReturnType<typeof pool.connect>,
  user: SeedUser
) {
  const existing = await client.query(
    'SELECT id FROM "user" WHERE email = $1',
    [user.email]
  );
  let userId = existing.rows[0]?.id as string | undefined;

  if (!userId) {
    userId = randomUUID();
    await client.query(
      `INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, user.name, user.email, true, null]
    );
  }

  const accountResult = await client.query(
    `SELECT id FROM "account" WHERE user_id = $1 AND provider_id = 'credential' LIMIT 1`,
    [userId]
  );
  const hashedPassword = hashPassword(user.password);

  if (accountResult.rows.length === 0) {
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
  } else {
    await client.query(
      `UPDATE "account" SET password = $1, updated_at = NOW()
       WHERE user_id = $2 AND provider_id = 'credential'`,
      [hashedPassword, userId]
    );
  }

  return userId;
}

async function seed() {
  const client = await pool.connect();
  try {
    const orgId = await ensureOrg(client);

    for (const user of users) {
      const userId = await ensureUser(client, user);
      await client.query(
        `INSERT INTO "org_memberships" (org_id, user_id, role, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (org_id, user_id) DO NOTHING`,
        [orgId, userId, user.role]
      );

      await client.query(
        `INSERT INTO "user_settings" (user_id, last_org_id, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET last_org_id = EXCLUDED.last_org_id, updated_at = NOW()`,
        [userId, orgId]
      );
    }

    console.log("✅ Seeded users for org:", orgName);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
