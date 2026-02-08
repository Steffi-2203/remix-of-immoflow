/**
 * Water costs backfill runner.
 * Uses SettlementService.calculateWaterCostShares() to compute per-unit shares
 * and inserts adjustment invoice_lines for historical periods.
 *
 * Usage:
 *   node scripts/backfill/run_water_backfill.js --dry-run
 *   node scripts/backfill/run_water_backfill.js --execute --year 2025 --property-id <uuid>
 */

const { db } = require("../../server/db");
const { sql } = require("drizzle-orm");

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--execute");
  const yearIdx = args.indexOf("--year");
  const year = yearIdx >= 0 ? parseInt(args[yearIdx + 1], 10) : new Date().getFullYear() - 1;
  const propIdx = args.indexOf("--property-id");
  const propertyFilter = propIdx >= 0 ? args[propIdx + 1] : null;

  console.log(`Water costs backfill — year: ${year}, dryRun: ${dryRun}`);

  // Fetch properties with water expenses
  let propertyQuery = `
    SELECT DISTINCT p.id, p.name
    FROM properties p
    JOIN expenses e ON e.property_id = p.id
    WHERE e.year = ${year} AND e.category = 'wasser' AND e.ist_umlagefaehig = true
  `;
  if (propertyFilter) {
    propertyQuery += ` AND p.id = '${propertyFilter}'`;
  }

  const properties = await db.execute(sql.raw(propertyQuery));
  console.log(`Found ${properties.rows?.length || 0} properties with water expenses`);

  for (const prop of (properties.rows || [])) {
    // Sum total water cost for the year
    const costResult = await db.execute(sql.raw(`
      SELECT COALESCE(SUM(betrag), 0) as total
      FROM expenses
      WHERE property_id = '${prop.id}' AND year = ${year} AND category = 'wasser' AND ist_umlagefaehig = true
    `));
    const totalWaterCost = Number(costResult.rows?.[0]?.total || 0);

    // Fetch units
    const unitsResult = await db.execute(sql.raw(`
      SELECT id, top_nummer FROM units WHERE property_id = '${prop.id}'
    `));
    const unitIds = (unitsResult.rows || []).map(u => u.id);

    if (unitIds.length === 0 || totalWaterCost <= 0) {
      console.log(`  Skip ${prop.name}: no units or zero cost`);
      continue;
    }

    // Fetch weighted consumption
    const readingsResult = await db.execute(sql.raw(`
      SELECT unit_id, SUM(consumption * coefficient) as weighted
      FROM water_readings
      WHERE unit_id IN (${unitIds.map(id => `'${id}'`).join(",")})
        AND reading_date BETWEEN '${year}-01-01' AND '${year}-12-31'
      GROUP BY unit_id
    `));

    const readings = readingsResult.rows || [];
    const buildingTotal = readings.reduce((s, r) => s + Number(r.weighted || 0), 0);

    const shares = [];
    if (buildingTotal > 0) {
      for (const r of readings) {
        const share = Math.round((Number(r.weighted) / buildingTotal) * totalWaterCost * 100) / 100;
        shares.push({ unitId: r.unit_id, share, provisional: false });
      }
    } else {
      const perUnit = Math.round((totalWaterCost / unitIds.length) * 100) / 100;
      for (const uid of unitIds) {
        shares.push({ unitId: uid, share: perUnit, provisional: true });
      }
    }

    console.log(`  ${prop.name}: totalWaterCost=${totalWaterCost}, buildingTotal=${buildingTotal}`);
    for (const s of shares) {
      const desc = `Wasserkosten-Nachverrechnung ${year}`;
      const meta = JSON.stringify({ backfill: true, provisional: s.provisional, year });

      if (dryRun) {
        console.log(`    [DRY-RUN] unit=${s.unitId} share=${s.share} provisional=${s.provisional}`);
      } else {
        // Idempotent insert: skip if line already exists
        await db.execute(sql.raw(`
          INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate, meta)
          SELECT inv.id, '${s.unitId}', 'wasserkosten_nachverrechnung', '${desc}', ${s.share}, 10,
                 '${meta}'::jsonb
          FROM monthly_invoices inv
          WHERE inv.unit_id = '${s.unitId}' AND inv.year = ${year} AND inv.month = 12
          AND NOT EXISTS (
            SELECT 1 FROM invoice_lines il
            WHERE il.invoice_id = inv.id AND il.unit_id = '${s.unitId}'
              AND il.line_type = 'wasserkosten_nachverrechnung'
              AND il.meta->>'year' = '${year}'
          )
          LIMIT 1
        `));
        console.log(`    [INSERTED] unit=${s.unitId} share=${s.share}`);
      }
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
