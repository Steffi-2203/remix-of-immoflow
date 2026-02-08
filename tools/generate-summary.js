// tools/generate-summary.js
// Reads reconciliation artifacts and produces summary.json + summary.sha256
// Usage: node tools/generate-summary.js [dryrun.json] [db_lines.json]

const fs = require('fs');
const crypto = require('crypto');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function summarizeFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  const lines = Array.isArray(data) ? data : (data.preview || data.lines || data.invoiceLines || []);
  return {
    file: filePath,
    sha256: sha256(content),
    sizeBytes: Buffer.byteLength(content),
    rowCount: lines.length,
  };
}

const dryrunFile = process.argv[2] || 'dryrun.json';
const dbFile = process.argv[3] || 'db_lines.json';

const summary = {
  generatedAt: new Date().toISOString(),
  artifacts: [
    summarizeFile(dryrunFile),
    summarizeFile(dbFile),
    summarizeFile('missing_lines.json'),
    summarizeFile('dry_db_diffs.json'),
  ].filter(Boolean),
};

const summaryJson = JSON.stringify(summary, null, 2);
fs.writeFileSync('summary.json', summaryJson);
fs.writeFileSync('summary.sha256', sha256(summaryJson) + '  summary.json\n');

console.log('Generated summary.json and summary.sha256');
summary.artifacts.forEach(a => {
  console.log(`  ${a.file}: ${a.rowCount} rows, ${a.sizeBytes} bytes, sha256=${a.sha256.slice(0, 16)}...`);
});
