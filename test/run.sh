#!/usr/bin/env bash
# Generate tuples with OPA, load them into an in-memory Keto running the target OPL,
# then compare every (user, permission, resource) check with the parity oracle.
# Exit 0: all checks match. 1: mismatches or incomplete checks. 2: run failed.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${OPA:?set OPA to an opa binary}"
: "${KETO:?set KETO to a keto v26.4.5 binary}"
mode=${MODE:-per_assignment}
mapping=${MAPPING:-examples/mapping.json}
# The OPL must define every standard role in the mapping; use STANDARD=0 with an OPL that has none.
opl=${OPL:-$PWD/opl/hybrid.ts}
out=${RESULT_DIR:-$PWD/artifacts/${NAME:-$mode}}
read -r -a tenants <<<"${TENANTS:-examples/legacy-acme.json examples/legacy-globex.json}"

die() { echo "ERROR: $*" >&2; exit 2; }
# Keto listens on unix sockets, so no TCP ports are needed.
read_api() { local path=$1; shift; curl -s --max-time 5 --unix-socket "$work/read.sock" "http://keto$path" "$@"; }
write_api() { local path=$1; shift; curl -s --max-time 5 --unix-socket "$work/write.sock" "http://keto$path" "$@"; }
work=$(mktemp -d "${TMPDIR:-/tmp}/rbac2keto.XXXXXX") || die "cannot create a temporary directory"
pid=""
cleanup() { [[ -n $pid ]] && kill "$pid" 2>/dev/null && wait "$pid" 2>/dev/null; rm -rf "$work"; }
trap cleanup EXIT
rm -rf "$out" && mkdir -p "$out"

"$OPA" test rego/ >"$out/opa-test.txt" || { cat "$out/opa-test.txt"; die "opa test failed"; }

# STANDARD=0 ignores standard_roles, so every role becomes a role instance.
jq --arg mode "$mode" --arg std "${STANDARD:-1}" '.mapping.role_instance_mode = $mode
  | if $std == "0" then del(.mapping.standard_roles) else . end' "$mapping" >"$work/mapping.json"
for f in "${tenants[@]}"; do
  t=$(jq -r .tenant "$f")
  "$OPA" eval -f raw -d rego -d "$work/mapping.json" -i "$f" 'data.rbac2keto.result' >"$out/$t.json" ||
    die "opa eval failed for $f"
  echo "$t: status=$(jq -r .status "$out/$t.json") tuples=$(jq '.tuples|length' "$out/$t.json")" \
    "instances=$(jq '[.ledger[].instances[]]|unique|length' "$out/$t.json")"
done

cat >"$work/keto.yml" <<EOF
dsn: memory
serve:
  read: { host: "unix:$work/read.sock" }
  write: { host: "unix:$work/write.sock" }
  opl: { host: "unix:$work/opl.sock" }
  metrics: { host: "unix:$work/metrics.sock" }
namespaces:
  location: file://$opl
feature_flags:
  strict_mode: true
limit:
  max_read_depth: 10
  max_read_width: 100
log:
  level: error
EOF
"$KETO" serve -c "$work/keto.yml" >"$out/keto.log" 2>&1 &
pid=$!
for _ in $(seq 50); do
  kill -0 "$pid" 2>/dev/null || { cat "$out/keto.log" >&2; die "Keto exited before readiness"; }
  write_api /health/ready -f >/dev/null 2>&1 && break
  sleep 0.2
done
read_api /health/ready -f >/dev/null || die "Keto did not become ready"

jq -s '[.[].tuples[] | {action: "insert", relation_tuple: .}]' "$out"/*.json >"$work/patch.json"
code=$(write_api /admin/relation-tuples -o "$work/patch.out" -w '%{http_code}' -X PATCH \
  -H 'Content-Type: application/json' --data-binary @"$work/patch.json")
[[ $code == 204 ]] || { cat "$work/patch.out" >&2; die "tuple load returned HTTP $code"; }

# Every subject from every tenant against every resource and permission of
# every tenant, so cross-tenant denials are checked too.
jq -s -c '
  ([.[].parity.allow[] | tostring]) as $allow
  | (map(.parity.relations) | add | unique) as $rels
  | [.[].parity.subjects[]] as $subjects
  | [.[].parity.objects[]] as $objects
  | $subjects[] as $u | $objects[] as $o | $rels[] | select(.[0] == $o.namespace) as $r
  | {namespace: $o.namespace, object: $o.object, relation: ("Permit_" + $r[1]),
     subject_set: {namespace: "User", object: $u},
     expect: ([$u, $o.namespace, $r[1], $o.object] | tostring | IN($allow[]))}
' "$out"/*.json >"$work/checks.jsonl"

total=0 ok=0 over=0 under=0 incomplete=0
: >"$out/mismatches.jsonl"
while IFS= read -r c; do
  total=$((total + 1))
  body=$(jq -c 'del(.expect)' <<<"$c")
  resp=$(read_api /relation-tuples/check/openapi -w '\n%{http_code}' -X POST \
    -H 'Content-Type: application/json' -d "$body")
  status=${resp##*$'\n'}
  if [[ $status != 200 ]]; then
    incomplete=$((incomplete + 1))
    jq -c --arg s "$status" '. + {got: ("HTTP " + $s)}' <<<"$c" >>"$out/mismatches.jsonl"
    continue
  fi
  got=$(jq -r '.allowed' <<<"${resp%$'\n'*}")
  expect=$(jq -r .expect <<<"$c")
  if [[ $got == "$expect" ]]; then
    ok=$((ok + 1))
  else
    [[ $got == true ]] && over=$((over + 1)) || under=$((under + 1))
    jq -c --argjson g "$got" '. + {got: $g}' <<<"$c" >>"$out/mismatches.jsonl"
  fi
done <"$work/checks.jsonl"

{
  echo "mode=$mode mapping=$(basename "$mapping") standard=${STANDARD:-1} opl=$(basename "$opl") keto=$("$KETO" version 2>/dev/null | awk '/Version/{print $2}')"
  echo "checks=$total match=$ok over_grant=$over under_grant=$under incomplete=$incomplete"
} | tee "$out/report.txt"
[[ $ok == "$total" ]] || exit 1
