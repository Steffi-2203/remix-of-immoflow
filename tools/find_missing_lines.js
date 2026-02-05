const fs = require('fs');

// Load dry-run data
const dryrun = JSON.parse(fs.readFileSync('dryrun_2026_09.json', 'utf8'));

// Build expected lines from dry-run
const expectedLines = [];
dryrun.preview.forEach(p => {
  p.lines.forEach(line => {
    expectedLines.push({
      tenantId: p.invoice.tenantId,
      unitId: line.unitId,
      lineType: line.lineType,
      description: line.description,
      amount: line.amount,
      key: `${p.invoice.tenantId}|${line.unitId}|${line.lineType}|${line.description}`
    });
  });
});

console.log(`Expected lines from dry-run: ${expectedLines.length}`);

// Now we need to compare with DB - output the keys for SQL comparison
const keys = expectedLines.map(l => l.key);
fs.writeFileSync('expected_keys_sep.json', JSON.stringify(expectedLines, null, 2));
console.log('Keys saved to expected_keys_sep.json');
