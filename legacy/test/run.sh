#!/usr/bin/env bash
# Matrix, minimum depth, and load comparison. Exit 0: all checks complete/pass;
# 1: completed checks differ or hit limits; 2: incomplete run/infrastructure error.
# Usage: KETO=/path/to/keto N=500 RUNS=3 test/run.sh [setup-a-grants|setup-b-direct]
set -Eeuo pipefail
trap 'echo "ERROR: command failed at line $LINENO" >&2; exit 2' ERR
cd "$(dirname "$0")/.."
KETO=$(command -v "${KETO:-keto}")
# command -v may return a relative path; Keto is launched from a setup directory.
[[ $KETO == /* ]] || KETO="$PWD/$KETO"
N=${N:-500}
RUNS=${RUNS:-3}
[[ $N =~ ^[0-9]+$ && $RUNS =~ ^[1-9][0-9]*$ ]] || { echo "N must be nonnegative; RUNS must be positive" >&2; exit 2; }
work=$(mktemp -d)
source test/lib.sh
trap cleanup EXIT
require_free_ports
go run gen/main.go >/dev/null
RESULT_DIR=${RESULT_DIR:-$PWD/artifacts}
mkdir -p "$RESULT_DIR"
RESULT_DIR=$(cd "$RESULT_DIR" && pwd)
total=$(jq '.checks | length' model/scenario.json)
rels=$(jq -c '[.roles[] | select(.id == "R2") | .permissions[] | gsub("\\."; "_")]' model/catalog.json)

bulk() { # setup shape
  jq -n --argjson n "$N" --argjson rels "$rels" --arg setup "$1" --arg shape "$2" '
    def member($i): if $shape == "fan-in"
      then {namespace: "Group", object: "bulk-g-\($i)", relation: "members"}
      else {namespace: "User", object: "bulk-u-\($i)"} end;
    def scope($i): if $shape == "fan-in"
      then {namespace: "Branch", object: "acme-miami"}
      else {namespace: "Customer", object: "bulk-c-\($i)"} end;
    [range(0; $n) as $i |
      (if $shape == "fan-in" then {namespace: "Group", object: "bulk-g-\($i)", relation: "members",
        subject_set: {namespace: "User", object: "bulk-u-\($i)"}} else empty end),
      (if $setup == "setup-a-grants" then
        {namespace: "Grant", object: "bulk-\($i)", relation: "members", subject_set: member($i)},
        {namespace: "Grant", object: "bulk-\($i)", relation: "roles", subject_set: {namespace: "Role", object: "R2"}},
        ($rels[] | {namespace: "Grant", object: "bulk-\($i)", relation: ., subject_set: {namespace: "Grant", object: "bulk-\($i)", relation: "members"}}),
        (scope($i) + {relation: "grants", subject_set: {namespace: "Grant", object: "bulk-\($i)"}})
      else
        ($rels[] as $r | scope($i) + {relation: $r, subject_set: member($i)})
      end)]'
}

run_check() { # setup tuples label [extra config]
  local setup=$1 tuples=$2 label=$3
  local args=(-c keto.yml)
  [[ -z ${4:-} ]] || args+=(-c "$4")
  local log="$RESULT_DIR/$setup/$label.txt" rc=0 lines summary passed
  start_keto "$setup" "${args[@]}"
  go run gen/main.go verify -tuples "$tuples" >"$log" 2>&1 || rc=$?
  stop_keto
  cp "$work/keto.log" "$RESULT_DIR/$setup/$label-keto.log"
  CHECK_FAILED=$(grep -c '^FAIL' "$log" || true)
  lines=$(grep -Ec '^(FAIL|ok  ) ' "$log" || true)
  summary=$(grep -E "^[0-9]+/$total checks passed$" "$log" || true)
  passed=$((total - CHECK_FAILED))
  if [[ $lines != "$total" || $summary != "$passed/$total checks passed" ]] ||
     [[ $rc != 0 && $rc != 1 ]] ||
     [[ $rc == 0 && $CHECK_FAILED != 0 ]] || [[ $rc == 1 && $CHECK_FAILED == 0 ]]; then
    cat "$log" >&2
    die "verification did not complete consistently; see $log"
  fi
}

status=0
[[ $# != 0 ]] || set -- setup-a-grants setup-b-direct
for setup in "$@"; do
  case "$setup" in setup-a-grants|setup-b-direct) ;; *) die "unknown setup: $setup" ;; esac
  mkdir -p "$RESULT_DIR/$setup"
  out="$RESULT_DIR/$setup/results.txt"
  {
    echo "# $setup"
    echo "keto $("$KETO" version | awk '/^Version/ {print $2}'); binary $KETO"
    echo "Use the binary's build provenance to establish its version; a local build may print master."
    grep -E 'strict_mode|max_read' "$setup/keto.yml"
    echo "## Check matrix"
    run_check "$setup" "$setup/tuples.json" matrix
    cat "$RESULT_DIR/$setup/matrix.txt"
    [[ $CHECK_FAILED == 0 ]] || status=1
    echo "## Smallest max_read_depth that passes every check"
    minimum=none
    for depth in $(seq 1 10); do
      printf 'limit:\n  max_read_depth: %s\n' "$depth" >"$work/depth.yml"
      run_check "$setup" "$setup/tuples.json" "depth-$depth" "$work/depth.yml"
      if [[ $CHECK_FAILED == 0 ]]; then minimum=$depth; break; fi
    done
    echo "$minimum (configured maximum 10)"
    [[ $minimum != none ]] || status=1
    echo "## With $N bulk R2 assignments (failed checks per run, $RUNS runs)"
    for shape in reuse fan-in; do
      bulk "$setup" "$shape" >"$work/bulk.json"
      jq -s add "$setup/tuples.json" "$work/bulk.json" >"$work/tuples.json"
      results=""
      for run in $(seq "$RUNS"); do
        run_check "$setup" "$work/tuples.json" "$shape-$run"
        results+=" $CHECK_FAILED"
        [[ $CHECK_FAILED == 0 ]] || status=1
      done
      echo "$shape:$results"
    done
  } >"$out"
  echo "wrote $out"
done
exit "$status"
