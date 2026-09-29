#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0")/.."
source .project.env

DATE="$(date +%F)"
OUTDIR="docs/daily"
OUTFILE="$OUTDIR/$DATE.txt"

mkdir -p "$OUTDIR"

echo "Generating daily report for $DATE ..."

{
  echo "===== WoodSlabs Daily Report — $DATE ====="
  echo ""

  for STATUS in "Blocked" "In Progress" "Needs QA" "Todo" "Done"; do
    echo "--- $STATUS ---"
    gh issue list --repo "$GH_OWNER/$REPO" --state open --search "status:$STATUS" 2>/dev/null \
      || gh issue list --repo "$GH_OWNER/$REPO" --state open 2>/dev/null | head -20
    echo ""
  done

  echo "===== End of Report ====="
  echo "Review above and paste to your report channel manually."
} > "$OUTFILE"

echo "Report written to: $OUTFILE"
echo ""
cat "$OUTFILE"
