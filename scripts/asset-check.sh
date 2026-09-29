#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0")/.."
source .project.env

MANIFEST="docs/asset-manifest.txt"
ASSETS_DIR="assets"
SAVE="${1:-}"

if [[ ! -d "$ASSETS_DIR" ]]; then
  echo "No assets/ directory found. Create it and drop client files in."
  exit 0
fi

CURRENT="$(find "$ASSETS_DIR" -type f | sort)"

if [[ ! -f "$MANIFEST" ]]; then
  echo "No manifest yet. Run with --save to create baseline."
  echo ""
  echo "Current files in assets/:"
  echo "$CURRENT"
  if [[ "$SAVE" == "--save" ]]; then
    echo "$CURRENT" > "$MANIFEST"
    echo ""
    echo "Baseline saved to $MANIFEST"
  fi
  exit 0
fi

PREV="$(cat "$MANIFEST")"

NEW_FILES="$(comm -13 <(echo "$PREV") <(echo "$CURRENT"))"
REMOVED="$(comm -23 <(echo "$PREV") <(echo "$CURRENT"))"

echo "=== Asset Check — $(date +%F) ==="
echo ""

if [[ -n "$NEW_FILES" ]]; then
  echo "NEW files:"
  echo "$NEW_FILES"
else
  echo "NEW files: (none)"
fi

echo ""

if [[ -n "$REMOVED" ]]; then
  echo "REMOVED files:"
  echo "$REMOVED"
else
  echo "REMOVED files: (none)"
fi

if [[ "$SAVE" == "--save" ]]; then
  echo "$CURRENT" > "$MANIFEST"
  echo ""
  echo "Manifest updated: $MANIFEST"
fi
