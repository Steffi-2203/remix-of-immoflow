#!/usr/bin/env node
/**
 * Water costs backfill runner.
 * Uses SettlementService.calculateWaterCostShares() logic to compute per-unit
 * shares and inserts adjustment invoice_lines for historical periods.
 *
 * Usage:
 *   node scripts/backfill/run_water_backfill.js --year 2025 --dry-run
 *   node scripts/backfill/run_water_backfill.js --year 2025 --property-id <uuid> --execute
 */

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const { db } = require("../../server/db");
const { sql } = require("drizzle-orm");

const argv = yargs(hideBin(process.argv))
  .option("year", { type: "number", default: new Date().getFullYear() - 1, describe: "Settlement year" })
  .option("property-id", { type: "string", describe: "Limit to a single property" })
  .option("execute", { type: "boolean", default: false, describe: "Actually insert lines (default: dry-run)" })
  .option("dry-run", { type: "boolean", default: true, describe: "Preview only (default)" })
  .check((args) => {
    if (args.execute) args["dry-run"] = false;
    return true;
  })
  .argv;

async function main() {
  const year = argv.year;
  const dryRun = !argv.execute;
  const propertyFilter = argv["property-id"] || null;

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
  const propRows = properties.rows || properties || [];
  console.log(`Found ${propRows.length} properties with water expenses`);

  let totalInserted = 0;

  for (const prop of propRows) {
    const costResult = await db.execute(sql.raw(`
      SELECT COALESCE(SUM(betrag), 0) as total
      FROM expenses
      WHERE property_id = '${prop.id}' AND year = ${year} AND category = 'wasser' AND ist_umlagefaehig = true
    `));
    const costRows = costResult.rows || costResult || [];
    const totalWaterCost = Number(costRows[0]?.total || 0);

    const unitsResult = await db.execute(sql.raw(`
      SELECT id, top_nummer FROM units WHERE property_id = '${prop.id}'
    `));
    const unitRows = unitsResult.rows || unitsResult || [];
    const unitIds = unitRows.map(u => u.id);

    if (unitIds.length === 0 || totalWaterCost <= 0) {
      console.log(`  Skip ${prop.name}: no units or zero cost`);
      continue;
    }

    // Fetch weighted consumption from water_readings
    const readingsResult = await db.execute(sql.raw(`
      SELECT unit_id, SUM(consumption * coefficient) as weighted
      FROM water_readings
      WHERE unit_id IN (${unitIds.map(id => `'${id}'`).join(",")})
        AND reading_date BETWEEN '${year}-01-01' AND '${year}-12-31'
      GROUP BY unit_id
    `));
    const readings = readingsResult.rows || readingsResult || [];
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

    console.log(`  ${prop.name}: totalWaterCost=${totalWaterCost}, buildingTotal=${buildingTotal}, units=${shares.length}`);

    for (const s of shares) {
      const desc = `Wasserkosten-Nachverrechnung ${year}`;
      const meta = JSON.stringify({ backfill: true, provisional: s.provisional, year });

      if (dryRun) {
        console.log(`    [DRY-RUN] unit=${s.unitId} share=${s.share} provisional=${s.provisional}`);
      } else {
        // Idempotent: skip if adjustment line already exists for this unit/year
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
        totalInserted++;
      }
    }
  }

  console.log(`Done. ${dryRun ? "Dry run" : `Inserted ${totalInserted} lines`}.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
