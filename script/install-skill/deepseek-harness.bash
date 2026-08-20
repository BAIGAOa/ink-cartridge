#!/usr/bin/env bash
set -euo pipefail

# Install repo skills into the DeepSeek harness (project-level .dsh/skills/).
#
# Copies every skill directory from skills/ (excluding README entries) into
# .dsh/skills/, where the DeepSeek harness discovers them as project skills.
# Re-runs are safe: the destination is rebuilt from scratch each time.
#
# Usage: ./script/install-skill/deepseek-harness.bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
SRC="$REPO_ROOT/skills"
DEST="$REPO_ROOT/.dsh/skills"

if [ ! -d "$SRC" ]; then
  echo "error: skills directory not found: $SRC" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

copied=0
for entry in "$SRC"/*; do
  name="$(basename "$entry")"
  case "$name" in
    README*) continue ;;
  esac
  if [ -d "$entry" ]; then
    cp -R "$entry" "$DEST/$name"
    # Strip README files inside the skill directory as well.
    find "$DEST/$name" -name 'README*' -type f -delete
    copied=$((copied + 1))
  fi
done

echo "Installed $copied skills into $DEST"