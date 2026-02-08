#!/usr/bin/env bash
set -euo pipefail

RUN_DIR="$1"

if [ -z "$RUN_DIR" ]; then
  echo "Usage: $0 <run_dir>"
  exit 2
fi

echo "Validating artifacts in $RUN_DIR"

# 1) summary.json exists
if [ ! -f "$RUN_DIR/summary.json" ]; then
  echo "ERROR: summary.json missing"
  exit 3
fi

# 2) checksums.sha256 exists
if [ ! -f "$RUN_DIR/checksums.sha256" ]; then
  echo "ERROR: checksums.sha256 missing"
  exit 4
fi

# 3) If missing_lines.csv exists, verify checksum
if [ -f "$RUN_DIR/missing_lines.csv" ]; then
  pushd "$RUN_DIR" > /dev/null
  sha256sum -c checksums.sha256 --status
  if [ $? -ne 0 ]; then
    echo "ERROR: checksum verification failed"
    exit 5
  fi
  popd > /dev/null
  echo "Checksum OK"
else
  echo "No missing_lines.csv produced (empty run) — OK"
fi

# 4) Basic summary sanity checks
jq -e '.run_id and .timestamp and .missing_lines_count != null' "$RUN_DIR/summary.json" >/dev/null || {
  echo "ERROR: summary.json missing required fields"
  exit 6
}

echo "Artifact validation passed"
