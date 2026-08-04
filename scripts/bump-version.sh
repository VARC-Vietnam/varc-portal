#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/bump-version.sh <version>"
  echo "Example: ./scripts/bump-version.sh 1.0.26"
  exit 1
fi

VERSION="${1#v}"

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid version: $VERSION (expected semver like 1.0.26)"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository"
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first."
  git status --short
  exit 1
fi

echo "$VERSION" > VERSION

node <<EOF
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
pkg.version = "${VERSION}";
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
EOF

git add VERSION package.json
git commit -m "chore: bump version to ${VERSION}"

echo
echo "Bumped and committed version ${VERSION}"
echo
echo "Next steps:"
echo "  git push origin HEAD"
echo "  git tag v${VERSION}"
echo "  git push origin v${VERSION}"
