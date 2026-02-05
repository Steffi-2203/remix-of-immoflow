// tools/compare_dryrun_db.js
const fs = require('fs');
const dry = JSON.parse(fs.readFileSync('dryrun.json'));
const db = JSON.parse(fs.readFileSync('invoice_lines_run.json'));

function flattenDry(d) {
  return (d.invoiceLines || d.lines || []).map(l => ({
    invoiceId: l.invoiceId || l.invoice_id || null,
    unitId: l.unitId || l.unit_id || l.unit || null,
    lineType: l.lineType || l.line_type || null,
    description: (l.description || '').trim(),
    amount: Number(l.amount || 0).toFixed(2)
  }));
}

function flattenDb(dbArr) {
  if (Array.isArray(dbArr) && dbArr.length && dbArr[0].lines) {
    return dbArr.flatMap(inv => (inv.lines || []).map(l => ({
      invoiceId: inv.invoice_id || inv.id,
      unitId: l.unit_id,
      lineType: l.line_type,
      description: (l.description || '').trim(),
      amount: Number(l.amount || 0).toFixed(2)
    })));
  }
  return dbArr.map(l => ({
    invoiceId: l.invoice_id || l.invoiceId || null,
    unitId: l.unit_id || l.unitId || l.unit || null,
    lineType: l.line_type || l.lineType || null,
    description: (l.description || '').trim(),
    amount: Number(l.amount || 0).toFixed(2)
  }));
}

const dryLines = flattenDry(dry).sort((a,b)=> (a.invoiceId||'').localeCompare(b.invoiceId||'') || (a.unitId||'').localeCompare(b.unitId||''));
const dbLines = flattenDb(db).sort((a,b)=> (a.invoiceId||'').localeCompare(b.invoiceId||'') || (a.unitId||'').localeCompare(b.unitId||''));

const diffs = [];
const max = Math.max(dryLines.length, dbLines.length);
for (let i=0;i<max;i++) {
  const a = dryLines[i];
  const b = dbLines[i];
  if (!a || !b || a.amount !== b.amount || a.unitId !== b.unitId || a.description !== b.description || a.lineType !== b.lineType) {
    diffs.push({ index: i, dry: a || null, db: b || null });
  }
}
console.log('Diffs count:', diffs.length);
if (diffs.length) fs.writeFileSync('dry_db_diffs.json', JSON.stringify(diffs, null, 2));
