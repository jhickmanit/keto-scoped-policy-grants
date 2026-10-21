#!/usr/bin/env bash
# Demonstrates a shared-role hazard in a rewritten illustrative model: two user
# groups share one role, each group is assigned to a different client, and a
# member of either group gets the permission on both clients.
# Usage: KETO=/path/to/keto STRICT_MODE=true test/prior-pattern/run.sh
set -euo pipefail

cd "$(dirname "$0")"
KETO=$(command -v "${KETO:-keto}")
[[ $KETO == /* ]] || KETO="$PWD/$KETO"
STRICT_MODE=${STRICT_MODE:-true}
work=$(mktemp -d)
source ../lib.sh
trap cleanup EXIT
require_free_ports

"$KETO" validate opl prior.keto.ts
cat >"$work/keto.yml" <<EOF
dsn: memory
namespaces:
  location: file://$PWD/prior.keto.ts
feature_flags:
  strict_mode: $STRICT_MODE
log:
  level: error
EOF
start_keto "$PWD" -c "$work/keto.yml"

jq '[.[] | {action: "insert", relation_tuple: .}]' tuples.json |
  curl -sf --max-time 30 -X PATCH http://127.0.0.1:4467/admin/relation-tuples -H 'Content-Type: application/json' -d @-

status=0
check() { # user client expected
  local got
  got=$(curl -sf --max-time 30 -X POST http://127.0.0.1:4466/relation-tuples/check/openapi \
    -d "{\"namespace\":\"Client\",\"object\":\"$2\",\"relation\":\"Permit_View\",\"subject_set\":{\"namespace\":\"User\",\"object\":\"$1\"}}" | jq -er '.allowed | if type == "boolean" then tostring else error("missing boolean allowed") end')
  local mark="ok  "
  [[ $got == "$3" ]] || { mark="LEAK"; status=1; }
  echo "$mark $1 View $2: allowed=$got (want $3)"
}
check ann client-a true
check ben client-b true
check ben client-a false
check ann client-b false
exit $status
