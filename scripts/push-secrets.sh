#!/bin/bash

# Push Secrets to Cloudflare Workers Production
# Usage: npm run secrets:update (from app-bub/)
#
# Reads .dev.vars and pushes to production:
#   - DEV is always pushed as "false"
#   - DEV_ prefixed vars are skipped (dev-only)
#   - PROD_ prefixed vars are pushed with the PROD_ prefix intact
#   - Empty values are skipped

set -e

DEV_VARS_FILE=".dev.vars"

if [ ! -f "$DEV_VARS_FILE" ]; then
  echo "Error: $DEV_VARS_FILE not found"
  echo "Make sure you're in the app-bub directory"
  exit 1
fi

# Delete all existing secrets
echo "Fetching existing secrets from production..."
EXISTING_SECRETS=$(npx wrangler secret list --json 2>/dev/null | python3 -c "import sys,json; [print(s['name']) for s in json.load(sys.stdin)]" 2>/dev/null || echo "")

if [ -n "$EXISTING_SECRETS" ]; then
  echo "Deleting existing secrets..."
  while IFS= read -r secret_name; do
    if [ -n "$secret_name" ]; then
      echo "  Deleting $secret_name..."
      echo "y" | npx wrangler secret delete "$secret_name" 2>/dev/null || true
    fi
  done <<< "$EXISTING_SECRETS"
  echo "  ✓ All existing secrets deleted"
  echo ""
else
  echo "  No existing secrets found"
  echo ""
fi

echo "Reading secrets from $DEV_VARS_FILE..."
echo ""

# Build JSON object for wrangler secret bulk
JSON="{\"DEV\":\"false\""
PUSHED=("DEV=false")
SKIPPED=()

while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

  # Parse KEY=VALUE
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    KEY="${BASH_REMATCH[1]}"
    VALUE="${BASH_REMATCH[2]}"

    # Skip DEV (already set to false)
    [[ "$KEY" == "DEV" ]] && continue

    # Skip DEV_ prefixed vars (dev-only)
    if [[ "$KEY" == DEV_* ]]; then
      SKIPPED+=("$KEY (dev-only)")
      continue
    fi

    # Skip empty values
    if [[ -z "$VALUE" ]]; then
      SKIPPED+=("$KEY (empty)")
      continue
    fi

    # Escape quotes in value for JSON
    ESCAPED_VALUE="${VALUE//\\/\\\\}"
    ESCAPED_VALUE="${ESCAPED_VALUE//\"/\\\"}"

    JSON+=",\"$KEY\":\"$ESCAPED_VALUE\""
    PUSHED+=("$KEY")
  fi
done < "$DEV_VARS_FILE"

JSON+="}"

# Show summary
echo "Secrets to push (${#PUSHED[@]}):"
for secret in "${PUSHED[@]}"; do
  echo "  ✓ $secret"
done
echo ""

if [ ${#SKIPPED[@]} -gt 0 ]; then
  echo "Skipped:"
  for secret in "${SKIPPED[@]}"; do
    echo "  - $secret"
  done
  echo ""
fi

# Confirm
read -p "Push ${#PUSHED[@]} secrets to production? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

# Push
echo ""
echo "Pushing secrets..."
echo "$JSON" | npx wrangler secret bulk

echo ""
echo "Done! ${#PUSHED[@]} secrets pushed to production."
