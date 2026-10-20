## Contract spec golden file

Every public function and error discriminant exposed by this contract is pinned in
`contracts/alert-registry/spec.golden.json`. That file is extracted from the
built WASM with `stellar contract info interface --output json` and verified in CI
so that renaming or removing an entrypoint (which would silently break every
generated binding) fails a PR before it lands.

### Regenerate

Only regenerate after rebuilding and re-optimizing the release WASM:

```bash
cargo build --release --target wasm32-unknown-unknown --locked -p alert-registry -p watcher-registry
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/alert_registry.wasm
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/watcher_registry.wasm
bash scripts/update-spec-golden.sh
```

Then commit the new `contracts/alert-registry/spec.golden.json` (and/or
`contracts/watcher-registry/spec.golden.json`) alongside the change that required it.

### Same check in CI

```bash
bash scripts/spec-golden.sh
```

or `make spec-check`. The CI job `spec-golden` runs this check on every PR and push
to `main`.
