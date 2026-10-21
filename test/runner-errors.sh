#!/usr/bin/env bash
# Regression: completed passes/mismatches and incomplete runs have distinct exits.
set -euo pipefail
cd "$(dirname "$0")/.."
fixture=$(mktemp -d)
trap 'rm -rf "$fixture"' EXIT
mkdir -p "$fixture/bin" "$fixture/test" "$fixture/model" "$fixture/setup-a-grants"
cp test/run.sh test/lib.sh "$fixture/test/"
cp model/catalog.json model/scenario.json "$fixture/model/"
cp setup-a-grants/keto.yml setup-a-grants/tuples.json "$fixture/setup-a-grants/"
cat >"$fixture/bin/go" <<'STUB'
#!/usr/bin/env bash
if [[ $* == *verify* ]]; then
  if [[ $FAULT == load ]]; then echo 'load tuples: simulated failure'; exit 1; fi
  if [[ $FAULT == truncated ]]; then
    echo 'ok   alice true example Client:example'
    echo '31/31 checks passed'
    exit 0
  fi
  count=31
  [[ $FAULT != mismatch ]] || count=30
  for i in $(seq "$count"); do echo 'ok   alice true example Client:example'; done
  if [[ $FAULT == mismatch ]]; then
    echo 'FAIL alice false example Client:example'
    echo '30/31 checks passed'
    exit 1
  fi
  echo '31/31 checks passed' 
fi
STUB
cat >"$fixture/bin/curl" <<'STUB'
#!/usr/bin/env bash
# No real sockets: preflight should find free ports; readiness then succeeds.
n=$(cat "$CURL_COUNT" 2>/dev/null || echo 0)
printf '%s\n' "$((n+1))" >"$CURL_COUNT"
[[ $n -ge 2 ]]
STUB
cat >"$fixture/bin/keto" <<'STUB'
#!/usr/bin/env bash
case "$1" in version) echo 'Version: stub' ;; serve) exec sleep 30 ;; esac
STUB
chmod +x "$fixture/bin/"*
for fault in load truncated complete mismatch; do
  expected=2
  [[ $fault != complete ]] || expected=0
  [[ $fault != mismatch ]] || expected=1
  rm -f "$fixture/count"
  rc=0
  PATH="$fixture/bin:$PATH" KETO="$fixture/bin/keto" FAULT=$fault CURL_COUNT="$fixture/count" \
    N=1 RUNS=1 bash "$fixture/test/run.sh" setup-a-grants >"$fixture/output" 2>&1 || rc=$?
  if [[ $rc != "$expected" ]]; then cat "$fixture/output"; echo "expected exit $expected, got $rc ($fault)" >&2; exit 1; fi
  echo "PASS: $fault returned exit $expected"
done
