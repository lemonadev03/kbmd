const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function deleteUser() {
  const client = await pool.connect();
  try {
    await client.query(
      'DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE email = $1)',
      ["admin@fma.com"]
    );
    await client.query('DELETE FROM "user" WHERE email = $1', ["admin@fma.com"]);
    console.log("✅ Deleted existing user");
  } finally {
    client.release();
    await pool.end();
  }
}

deleteUser();
