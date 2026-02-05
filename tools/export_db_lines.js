import pg from 'pg';

const runId = process.argv[2];
if (!runId) {
  console.error('Usage: node tools/export_db_lines.js <run_id>');
  console.error('Example: node tools/export_db_lines.js 88030ba3-52a5-4a93-80bc-b3b3e2ebdd19');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const result = await client.query(`
  SELECT il.unit_id, il.line_type, il.description, il.amount, il.tax_rate
  FROM invoice_lines il
  JOIN monthly_invoices mi ON mi.id = il.invoice_id
  WHERE mi.run_id = $1
  ORDER BY il.unit_id, il.line_type, il.description
`, [runId]);

await client.end();

const fs = await import('fs');
fs.default.writeFileSync('db_lines.json', JSON.stringify(result.rows, null, 2));
console.log(`Exportiert: ${result.rows.length} Zeilen nach db_lines.json`);
