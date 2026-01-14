import { Pool } from "pg";
import { randomBytes, scryptSync } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// BetterAuth uses scrypt for password hashing
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function createAdmin() {
  const client = await pool.connect();

  const email = "admin@fma.com";
  const password = "admin123"; // Change this to your desired password
  const name = "Admin";
  const userId = crypto.randomUUID();

  try {
    console.log(`Creating admin user: ${email}`);

    // Check if user already exists
    const existing = await client.query(
      'SELECT id FROM "user" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log("ℹ️ User already exists with ID:", existing.rows[0].id);
      return;
    }

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
        crypto.randomUUID(),
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

    console.log("✅ Admin user created successfully!");
    console.log("User ID:", userId);
    console.log("Email:", email);
    console.log("Password:", password);
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
