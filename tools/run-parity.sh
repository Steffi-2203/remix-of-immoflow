#!/usr/bin/env bash
set -euo pipefail

RUN_ID=$(uuidgen)
OUT_DIR="reconciliations/${RUN_ID}"
mkdir -p "$OUT_DIR"

# 1) Run parity harness
node scripts/parity-harness.js --out "$OUT_DIR" --db "$STAGING_DATABASE_URL" || {
  echo "Parity harness failed"
  exit 10
}

# 2) Generate checksums
pushd "$OUT_DIR" > /dev/null
if [ -f missing_lines.csv ]; then
  sha256sum missing_lines.csv > checksums.sha256
else
  echo "No missing_lines.csv; create empty checksums.sha256" > checksums.sha256
fi
popd > /dev/null

# 3) Validate artifacts
./tools/validate-artifacts.sh "$OUT_DIR"

# 4) If validation passed, upload artifacts (GHA step handles upload)
echo "Parity run $RUN_ID OK"
echo "RUN_ID=$RUN_ID" >> "$GITHUB_OUTPUT"
