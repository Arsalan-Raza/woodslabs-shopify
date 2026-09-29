#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0")/.."
source .project.env

MODE="${1:-all}"

check() {
  echo "=== Store session ==="
  shopify theme list --store "$STORE" 2>&1 | head -5 || echo "(no theme session)"
  echo ""
  echo "Store: $STORE"
  echo "Theme: $THEME_NAME"
}

if [[ "$MODE" == "check" ]]; then
  check
  exit 0
fi

echo "Logging out of any existing Shopify sessions..."
shopify auth logout 2>/dev/null || true

if [[ "$MODE" == "all" || "$MODE" == "theme" ]]; then
  echo ""
  echo "Authenticating theme session for $STORE ..."
  shopify theme list --store "$STORE"
fi

if [[ "$MODE" == "all" || "$MODE" == "admin" ]]; then
  echo ""
  echo "Authenticating admin session for $STORE ..."
  shopify store auth --store "$STORE" \
    --scopes read_products,write_products,read_themes,write_themes,read_orders,read_script_tags,write_script_tags
  # Scopes: products (configurator reads), themes (deployment),
  #         orders (for order review), script_tags (app proxy JS injection)
  # Excluded: payouts, billing, staff, customer PII
fi

echo ""
echo "Done. Run './scripts/store-auth.sh check' to verify."
