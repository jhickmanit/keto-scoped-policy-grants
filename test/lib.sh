#!/usr/bin/env bash
# Shared lifecycle helpers. Caller supplies KETO and work, and installs cleanup.
pid=""
die() { echo "ERROR: $*" >&2; exit 2; }
stop_keto() {
  if [[ -n $pid ]]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    pid=""
  fi
}
cleanup() { stop_keto; rm -rf "$work"; }
require_free_ports() {
  local port
  for port in 4466 4467; do
    if curl -s --max-time 1 -o /dev/null "http://127.0.0.1:$port/health/ready"; then
      die "port $port is already serving HTTP; stop that process before running tests"
    fi
  done
}
start_keto() { # working directory, config args...
  local dir=$1
  shift
  (cd "$dir" && exec "$KETO" serve "$@") >"$work/keto.log" 2>&1 &
  pid=$!
  local attempt
  for attempt in $(seq 50); do
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$work/keto.log" >&2
      die "Keto exited before readiness"
    fi
    if curl -sf --max-time 1 http://127.0.0.1:4466/health/ready >/dev/null &&
       curl -sf --max-time 1 http://127.0.0.1:4467/health/ready >/dev/null; then
      kill -0 "$pid" 2>/dev/null || die "Keto exited during readiness"
      return
    fi
    sleep 0.2
  done
  cat "$work/keto.log" >&2
  die "Keto did not become ready"
}
