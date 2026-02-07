import fs from 'fs';
import pg from 'pg';

const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
};
const positional = args.filter(a => !a.startsWith("--"));
const dryRun = args.includes('--dry-run');

const csvFile = getArg("csv");
const jsonFile = getArg("json") || positional[0];
const runIdOverride = getArg("run-id");
const dbUrl = getArg("database-url") || process.env.DATABASE_URL;
const missingFile = csvFile || jsonFile || 'missing_lines.json';

if (!fs.existsSync(missingFile)) {
  console.error(`Datei nicht gefunden: ${missingFile}`);
  console.error('Usage: node tools/upsert_missing_lines.js [missing_lines.json] [--dry-run]');
  console.error('   or: node tools/upsert_missing_lines.js --csv=missing_lines.csv [--run-id=RUN_ID] [--dry-run]');
  console.error('   or: node tools/upsert_missing_lines.js --json=missing_lines.json [--database-url=...] [--dry-run]');
  process.exit(1);
}

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

let missingLines;
if (csvFile || missingFile.endsWith('.csv')) {
  const csvContent = fs.readFileSync(missingFile, 'utf8');
  missingLines = parseCsv(csvContent).map(row => ({
    tenantId: row.tenantId || row.tenant_id,
    unitId: row.unitId || row.unit_id,
    lineType: row.lineType || row.line_type,
    description: row.description,
    amount: parseFloat(row.amount),
    taxRate: parseFloat(row.taxRate || row.tax_rate || 0)
  }));
} else {
  missingLines = JSON.parse(fs.readFileSync(missingFile, 'utf8'));
}

if (missingLines.length === 0) {
  console.log('Keine fehlenden Zeilen - nichts zu tun.');
  process.exit(0);
}

console.log(`${dryRun ? '[DRY-RUN] ' : ''}Fehlende Zeilen: ${missingLines.length}`);

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

const affectedTenants = [...new Set(missingLines.map(l => l.tenantId))];
console.log(`Betroffene Mieter: ${affectedTenants.length}`);

const invoiceMap = new Map();
for (const tenantId of affectedTenants) {
  const result = await client.query(`
    SELECT id, tenant_id, unit_id, year, month 
    FROM monthly_invoices 
    WHERE tenant_id = $1
  `, [tenantId]);
  
  for (const row of result.rows) {
    const key = `${row.tenant_id}|${row.year}|${row.month}`;
    invoiceMap.set(key, { invoiceId: row.id, unitId: row.unit_id });
  }
}

console.log(`Invoices gemappt: ${invoiceMap.size}`);

let inserted = 0;
let skipped = 0;
let errors = [];

for (const line of missingLines) {
  const period = line.description.match(/(\w+)\s+(\d{4})$/);
  if (!period) {
    errors.push({ line, reason: 'Periode nicht erkannt' });
    continue;
  }
  
  const monthNames = {
    'Jänner': 1, 'Februar': 2, 'März': 3, 'April': 4, 'Mai': 5, 'Juni': 6,
    'Juli': 7, 'August': 8, 'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
  };
  
  const month = monthNames[period[1]];
  const year = parseInt(period[2]);
  
  if (!month) {
    errors.push({ line, reason: `Unbekannter Monat: ${period[1]}` });
    continue;
  }
  
  const key = `${line.tenantId}|${year}|${month}`;
  const invoice = invoiceMap.get(key);
  
  if (!invoice) {
    errors.push({ line, reason: `Invoice nicht gefunden: ${key}` });
    continue;
  }

  if (dryRun) {
    console.log(`  [DRY] INSERT: ${line.lineType} ${line.description} €${line.amount}`);
    inserted++;
  } else {
    try {
      const result = await client.query(`
        INSERT INTO invoice_lines (invoice_id, unit_id, line_type, description, amount, tax_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (invoice_id, unit_id, line_type, description) DO NOTHING
        RETURNING id
      `, [invoice.invoiceId, invoice.unitId, line.lineType, line.description, line.amount, line.taxRate]);
      
      if (result.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push({ line, reason: err.message });
    }
  }
}

await client.end();

console.log(`\n=== Ergebnis ===`);
console.log(`Eingefügt: ${inserted}`);
console.log(`Übersprungen (bereits vorhanden): ${skipped}`);
console.log(`Fehler: ${errors.length}`);

if (errors.length > 0) {
  console.log('\nFehler-Details:');
  errors.slice(0, 10).forEach(e => {
    console.log(`  ${e.line.lineType}: ${e.line.description} - ${e.reason}`);
  });
  fs.writeFileSync('upsert_errors.json', JSON.stringify(errors, null, 2));
  console.log('\nAlle Fehler gespeichert: upsert_errors.json');
}

if (dryRun) {
  console.log('\n[DRY-RUN] Keine Änderungen geschrieben. Entferne --dry-run für echtes Insert.');
}
