#!/usr/bin/env bash
# scripts/update-spec-golden.sh — Overwrite committed contract spec golden files
#
# Convenience wrapper so developers can run `make spec-golden-update`.
# It calls `scripts/spec-golden.sh --update`, which extracts the contract spec
# from the built WASM and rewrites `contracts/*/spec.golden.json`.
#
# You must build and optimize the WASM first:
#   cargo build --release --target wasm32-unknown-unknown --locked -p alert-registry -p watcher-registry
#   stellar contract optimize --wasm target/wasm32-unknown-unknown/release/alert_registry.wasm
#   stellar contract optimize --wasm target/wasm32-unknown-unknown/release/watcher_registry.wasm
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/spec-golden.sh" --update
