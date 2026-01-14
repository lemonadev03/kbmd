const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    // Load FAQs from JSON
    const faqs = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data/faqs.json"), "utf8")
    );

    console.log("Importing FAQs...");
    let count = 0;
    for (const f of faqs) {
      await client.query(
        `INSERT INTO faqs (id, section_id, question, answer, notes, "order", created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING`,
        [f.id, f.section_id, f.question, f.answer, f.notes, f.order, f.created_at, f.updated_at]
      );
      count++;
    }
    console.log(`✅ FAQs imported: ${count}`);

    // Import custom rules
    console.log("Importing custom rules...");
    const customRulesContent = `# Mental Notes
How to Enroll/Join/Start = https://www.fmafreewebinar.com/

Uses Keyword "3DFC" = https://www.fma3dayfunnelchallenge.com/
If they want to join a live training, use this and mention these points.
- it is beginner friendly
- live on Feb 12-14
- we go live sa zoom
- we provide free 2 weeks replay
- we highly encourage you to join live kasi iba energy pag live

Uses Keyword "BYFFC" = https://buildyourfirstfunnelchallenge.com/
If they want to learn right now and not wait for long, use this and mention these points.
- lifetime access
- beginner friendly
- they learn 2 funnel platforms: Systeme and GHL
- instant access

Uses Keyword "Community" = https://www.facebook.com/groups/funnelsmasterycommunity
If they want to join the free Facebook group, share that link.

If they mention the keyword "Free" or "Libre" = https://www.fmafreewebinar.com/
Use the link above.`;

    await client.query(
      `INSERT INTO custom_rules (id, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [
        "26ceacb9-8f4e-499c-a8f2-8dea97b0442a",
        customRulesContent,
        "2026-01-14T09:11:01.478Z",
        "2026-01-14T10:12:01.556Z",
      ]
    );
    console.log(`✅ Custom rules imported: 1`);

    console.log("\n🎉 Data migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
