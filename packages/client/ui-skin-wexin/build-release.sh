#!/bin/bash
# Build the published dsh-wexin artifacts (@dsh-external/dsh-wexin) from
# this fork, then restore the fork's own in-repo artifacts so the running
# harness keeps resolving the in-tree package name.
#
# The two builds MUST differ: the fork's cordis.patch.yml mounts the skin
# as @deepseek-ai/dsh-client-ui-skin-wexin, while the published repo
# (LaplaceYoung/dsh-wexin) bundles under @dsh-external/dsh-wexin. This
# script swaps the name for the release build and immediately restores
# both sources and artifacts.
set -euo pipefail
cd "$(dirname "$0")/../.."          # repo root

PKG=packages/client/ui-skin-wexin
REL_DIR="${1:-/tmp/dsh-wexin-release}"

echo "==> 1. swap to the published package name"
sed -i '' 's/@deepseek-ai\/dsh-client-ui-skin-wexin/@dsh-external\/dsh-wexin/g' \
  "$PKG/src/invariant.ts" "$PKG/tsdown.config.ts"

cleanup() {
  echo "==> restoring fork sources + artifacts"
  git checkout -- "$PKG/src/invariant.ts" "$PKG/tsdown.config.ts"
  pnpm exec tsc -b "$PKG/tsconfig.json" >/dev/null 2>&1 || true
  pnpm --filter @deepseek-ai/dsh-client-ui-skin-wexin bundle >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "==> 2. release build"
pnpm exec tsc -b "$PKG/tsconfig.json"
(cd "$PKG" && pnpm exec tsdown --config tsdown.config.ts)

echo "==> 3. copy artifacts"
mkdir -p "$REL_DIR"
rm -rf "$REL_DIR/lib"
cp -R "$PKG/lib" "$REL_DIR/lib"

echo "done; artifacts at $REL_DIR/lib"
