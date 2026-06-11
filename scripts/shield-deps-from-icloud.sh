#!/usr/bin/env bash
# Shield node_modules and .next from iCloud Drive sync.
#
# This repo lives under the iCloud-synced Desktop. iCloud continuously
# corrupts high-churn directories (conflict-renames files to "name 2",
# drops originals), which broke esbuild and produced moving-target
# webpack failures in `next build`. iCloud skips paths ending in
# ".nosync", so the real directories live at node_modules.nosync /
# .next.nosync with symlinks at the canonical names.
#
# IMPORTANT: `npm ci` DELETES node_modules — including the symlink — and
# reinstalls into a real (iCloud-exposed) directory. Run this script
# after every `npm ci` (or use `npm run ci:local`, which chains it).
# `npm install` operates in place and does not break the symlink.
set -euo pipefail
cd "$(dirname "$0")/.."

shield() {
  local name="$1"
  local real="${name}.nosync"
  if [ -L "$name" ]; then
    echo "✓ $name already a symlink"
    return
  fi
  if [ -d "$name" ]; then
    if [ -d "$real" ]; then
      # Stale real dir from a previous shield — keep the fresh tree.
      rm -rf "$real"
    fi
    mv "$name" "$real"
  else
    mkdir -p "$real"
  fi
  ln -s "$real" "$name"
  echo "✓ $name → $real (shielded from iCloud)"
}

shield node_modules
shield .next
