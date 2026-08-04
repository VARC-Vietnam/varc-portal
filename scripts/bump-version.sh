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

echo "$VERSION" > VERSION

node <<EOF
const fs = require("fs");
const path = "package.json";
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
pkg.version = "${VERSION}";
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
EOF

echo "Bumped version to ${VERSION}"
echo "Updated: VERSION, package.json"
echo
echo "Next steps:"
echo "  git add VERSION package.json"
echo "  git commit -m \"chore: bump version to ${VERSION}\""
echo "  git push origin HEAD"
echo "  git tag v${VERSION}"
echo "  git push origin v${VERSION}"
