#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES_DIR="$ROOT_DIR/packages"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

require_command git
require_command node
require_command npm
require_command yarn

ensure_no_untracked_files() {
  local untracked
  untracked="$(git -C "$ROOT_DIR" ls-files --others --exclude-standard)"
  if [ -n "$untracked" ]; then
    echo "Untracked files must be added to git before release-publish:"
    printf '%s\n' "$untracked"
    exit 1
  fi
}

ensure_no_unstaged_changes() {
  if ! git -C "$ROOT_DIR" diff --quiet --ignore-submodules --; then
    echo "Unstaged changes must be added to git before release-publish:"
    git -C "$ROOT_DIR" diff --name-only --ignore-submodules --
    exit 1
  fi
}

ensure_no_staged_changes() {
  if ! git -C "$ROOT_DIR" diff --cached --quiet --ignore-submodules --; then
    echo "Staged but uncommitted changes must be committed before release-publish:"
    git -C "$ROOT_DIR" diff --cached --name-only --ignore-submodules --
    exit 1
  fi
}

discover_target_version() {
  node - "$ROOT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const packagesDir = path.join(rootDir, 'packages');
const versions = new Set();

for (const dirName of fs.readdirSync(packagesDir).sort()) {
  const packageJsonPath = path.join(packagesDir, dirName, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.version) {
    versions.add(pkg.version);
  }
}

if (versions.size !== 1) {
  console.error('Expected exactly one workspace package version, found:', Array.from(versions).join(', '));
  process.exit(1);
}

process.stdout.write(Array.from(versions)[0]);
NODE
}

compute_publish_order() {
  node - "$ROOT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const packagesDir = path.join(rootDir, 'packages');
const packageDirs = fs.readdirSync(packagesDir).sort();
const packages = [];
const byName = new Map();

for (const dirName of packageDirs) {
  const dir = path.join(packagesDir, dirName);
  const packageJsonPath = path.join(dir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const record = {
    name: pkg.name,
    dir,
    deps: new Set(),
  };
  packages.push(record);
  byName.set(record.name, record);
}

for (const record of packages) {
  const pkg = JSON.parse(fs.readFileSync(path.join(record.dir, 'package.json'), 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const deps = pkg[field] || {};
    for (const depName of Object.keys(deps)) {
      if (byName.has(depName)) {
        record.deps.add(depName);
      }
    }
  }
}

const inDegree = new Map();
const reverseEdges = new Map();

for (const record of packages) {
  inDegree.set(record.name, record.deps.size);
  reverseEdges.set(record.name, []);
}

for (const record of packages) {
  for (const depName of record.deps) {
    reverseEdges.get(depName).push(record.name);
  }
}

const queue = packages
  .filter((record) => inDegree.get(record.name) === 0)
  .map((record) => record.name)
  .sort();

const ordered = [];

while (queue.length > 0) {
  const currentName = queue.shift();
  ordered.push(byName.get(currentName));
  const dependents = reverseEdges.get(currentName).slice().sort();
  for (const dependentName of dependents) {
    const nextDegree = inDegree.get(dependentName) - 1;
    inDegree.set(dependentName, nextDegree);
    if (nextDegree === 0) {
      queue.push(dependentName);
      queue.sort();
    }
  }
}

if (ordered.length !== packages.length) {
  throw new Error('Unable to compute publish order because local package dependencies contain a cycle.');
}

for (const record of ordered) {
  process.stdout.write(record.dir + '\n');
}
NODE
}

ensure_no_untracked_files
ensure_no_unstaged_changes
ensure_no_staged_changes

TARGET_VERSION="$(discover_target_version)"
TAG_NAME="v$TARGET_VERSION"

if git -C "$ROOT_DIR" rev-parse --verify --quiet "refs/tags/$TAG_NAME" >/dev/null; then
  echo "Tag $TAG_NAME already exists." >&2
  exit 1
fi

PUBLISH_ORDER_FILE="$(mktemp)"
trap 'rm -f "$PUBLISH_ORDER_FILE"' EXIT
compute_publish_order > "$PUBLISH_ORDER_FILE"

echo "Publishing release $TARGET_VERSION"

SKIP_COUNT=0
SUCCESS_COUNT=0
FAIL_COUNT=0
SKIPPED_PACKAGES=()
PUBLISHED_PACKAGES=()
FAILED_PACKAGES=()

while IFS= read -r package_dir; do
  [ -n "$package_dir" ] || continue
  package_name="$(node - "$package_dir/package.json" <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write(pkg.name || '');
NODE
)"

  if npm view "${package_name}@${TARGET_VERSION}" version >/dev/null 2>&1; then
    echo "Skipping ${package_name}@${TARGET_VERSION}: version already exists on npm."
    SKIP_COUNT=$((SKIP_COUNT + 1))
    SKIPPED_PACKAGES+=("${package_name}@${TARGET_VERSION}")
    continue
  fi

  echo "==> Building $package_name"
  (
    cd "$package_dir"
    yarn build
  )

  echo "==> Publishing $package_name"
  if (
    cd "$package_dir"
    npm publish
  ); then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    PUBLISHED_PACKAGES+=("${package_name}@${TARGET_VERSION}")
  else
    echo "Publish failed for ${package_name}@${TARGET_VERSION}; continuing with remaining packages." >&2
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_PACKAGES+=("${package_name}@${TARGET_VERSION}")
  fi
done < "$PUBLISH_ORDER_FILE"

echo
echo "Publish summary:"
echo "  Published: $SUCCESS_COUNT"
echo "  Skipped:   $SKIP_COUNT"
echo "  Failed:    $FAIL_COUNT"

if [ "${#PUBLISHED_PACKAGES[@]}" -gt 0 ]; then
  echo "Published packages:"
  printf '  - %s\n' "${PUBLISHED_PACKAGES[@]}"
fi

if [ "${#SKIPPED_PACKAGES[@]}" -gt 0 ]; then
  echo "Skipped packages:"
  printf '  - %s\n' "${SKIPPED_PACKAGES[@]}"
fi

if [ "${#FAILED_PACKAGES[@]}" -gt 0 ]; then
  echo "Failed packages:"
  printf '  - %s\n' "${FAILED_PACKAGES[@]}"
  echo "Not creating git tag because one or more publishes failed." >&2
  exit 1
fi

git -C "$ROOT_DIR" tag -a "$TAG_NAME" -m "Release $TARGET_VERSION"

echo "Published release $TARGET_VERSION"
echo "Created git tag $TAG_NAME"
