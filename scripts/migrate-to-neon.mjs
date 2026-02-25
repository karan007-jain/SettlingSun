/**
 * Migrate Exch and IdMaster data from local Postgres → Neon
 * Run with: node scripts/migrate-to-neon.mjs
 */
import pg from "pg";
const { Client } = pg;

const LOCAL_URL =
  "postgresql://user:password@localhost:8888/db";
const NEON_URL =
  "postgresql://neondb_owner:npg_E9dgIVbpnOz1@ep-divine-term-ahxxhevc-pooler.c-3.us-east-1.aws.neon.tech/settling_sun?sslmode=require";

async function main() {
  const local = new Client({ connectionString: LOCAL_URL });
  const neon = new Client({ connectionString: NEON_URL });

  await local.connect();
  await neon.connect();
  console.log("✅ Connected to both databases");

  // ── Exch ──────────────────────────────────────────────────────────────────
  console.log("\n📦 Migrating Exch...");
  const { rows: exchRows } = await local.query('SELECT * FROM "Exch" ORDER BY "createdAt"');
  console.log(`   Found ${exchRows.length} records`);

  let exchInserted = 0, exchSkipped = 0;
  for (const r of exchRows) {
    try {
      await neon.query(
        `INSERT INTO "Exch" (id, "idName", "partyCode", "shortCode", rate, "idComm", "idAc", currency, template, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.idName, r.partyCode, r.shortCode, r.rate, r.idComm, r.idAc,
         r.currency ?? "PAISA", r.template ?? null, r.createdAt, r.updatedAt]
      );
      exchInserted++;
    } catch (e) {
      console.warn(`   ⚠️ Exch skip ${r.idName}: ${e.message}`);
      exchSkipped++;
    }
  }
  console.log(`   ✅ Exch: ${exchInserted} inserted, ${exchSkipped} skipped`);

  // ── IdMaster ── uplines first, then downlines ──────────────────────────────
  console.log("\n📦 Migrating IdMaster...");
  const { rows: idRows } = await local.query(
    `SELECT * FROM "IdMaster"
     ORDER BY CASE WHEN "uplineId" IS NULL THEN 0 ELSE 1 END, "createdAt"`
  );
  console.log(`   Found ${idRows.length} records`);

  let idInserted = 0, idSkipped = 0;
  for (const r of idRows) {
    try {
      await neon.query(
        `INSERT INTO "IdMaster" (id, "userId", "partyCode", "idCode", credit, comm, rate, pati, partner, active, "isUpline", "uplineId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.userId, r.partyCode, r.idCode, r.credit, r.comm, r.rate,
         r.pati ?? null, r.partner ?? null, r.active, r.isUpline,
         r.uplineId ?? null, r.createdAt, r.updatedAt]
      );
      idInserted++;
    } catch (e) {
      console.warn(`   ⚠️ IdMaster skip ${r.userId}: ${e.message}`);
      idSkipped++;
    }
  }
  console.log(`   ✅ IdMaster: ${idInserted} inserted, ${idSkipped} skipped`);

  // ── Verify ────────────────────────────────────────────────────────────────
  console.log("\n🔍 Verification:");
  const { rows: [ec] } = await neon.query('SELECT COUNT(*) FROM "Exch"');
  const { rows: [ic] } = await neon.query('SELECT COUNT(*) FROM "IdMaster"');
  console.log(`   Exch:     ${ec.count}`);
  console.log(`   IdMaster: ${ic.count}`);

  await local.end();
  await neon.end();
  console.log("\n🎉 Migration complete!");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
