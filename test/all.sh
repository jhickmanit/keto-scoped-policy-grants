#!/usr/bin/env bash
# Regenerate the hybrid OPLs, then run every OPL/mapping variant through
# test/run.sh. Exit 1 if any variant other than the shared-role comparison fails.
cd "$(dirname "$0")/.."
python3 -I tools/add_standard_roles.py examples/mapping.json opl/base.ts >opl/hybrid.ts || exit 2
python3 -I tools/add_standard_roles.py examples/mapping-decoded.json opl/base-decoded.ts >opl/hybrid-decoded.ts || exit 2

rc=0
run() { # expected exit, name, env assignments...
  local want=$1 name=$2
  shift 2
  echo "== $name"
  env NAME="$name" "$@" bash test/run.sh | grep -E '^(acme|globex|checks)'
  local got=${PIPESTATUS[0]}
  [[ $got == "$want" ]] || { echo "   unexpected exit $got (want $want)"; rc=1; }
}
run 0 base STANDARD=0 OPL="$PWD/opl/base.ts"
run 1 base-shared STANDARD=0 MODE=shared_role OPL="$PWD/opl/base.ts"
run 0 base-decoded STANDARD=0 MAPPING=examples/mapping-decoded.json OPL="$PWD/opl/base-decoded.ts"
run 0 hybrid OPL="$PWD/opl/hybrid.ts"
run 0 hybrid-decoded MAPPING=examples/mapping-decoded.json OPL="$PWD/opl/hybrid-decoded.ts"
exit $rc
