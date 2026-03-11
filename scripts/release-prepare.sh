#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$ROOT_DIR/.release-status.yml"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

require_command git
require_command node

ensure_no_untracked_files() {
  local untracked
  untracked="$(git -C "$ROOT_DIR" ls-files --others --exclude-standard)"
  if [ -n "$untracked" ]; then
    echo "Untracked files must be added to git before release-prepare:"
    printf '%s\n' "$untracked"
    exit 1
  fi
}

ensure_no_unstaged_changes() {
  if ! git -C "$ROOT_DIR" diff --quiet --ignore-submodules --; then
    echo "Unstaged changes must be added to git before release-prepare:"
    git -C "$ROOT_DIR" diff --name-only --ignore-submodules --
    exit 1
  fi
}

has_staged_changes() {
  ! git -C "$ROOT_DIR" diff --cached --quiet --ignore-submodules --
}

validate_semver() {
  node - "$1" <<'NODE'
const version = process.argv[2];
const isValid = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.test(version);
process.exit(isValid ? 0 : 1);
NODE
}

read_suggested_version() {
  sed -n 's/^suggestedNextVersion: "\(.*\)"$/\1/p' "$STATUS_FILE" | head -n 1
}

update_package_versions() {
  node - "$ROOT_DIR" "$1" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const nextVersion = process.argv[3];
const packageDirs = fs.readdirSync(path.join(rootDir, 'packages')).sort();
const packageJsonPaths = [];
const internalPackageNames = new Set();

for (const dirName of packageDirs) {
  const packageJsonPath = path.join(rootDir, 'packages', dirName, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }
  packageJsonPaths.push(packageJsonPath);
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (pkg.name) {
    internalPackageNames.add(pkg.name);
  }
}

const appDirs = path.join(rootDir, 'apps');
if (fs.existsSync(appDirs)) {
  for (const dirName of fs.readdirSync(appDirs).sort()) {
    const packageJsonPath = path.join(appDirs, dirName, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      packageJsonPaths.push(packageJsonPath);
    }
  }
}

const rootPackageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(rootPackageJsonPath)) {
  packageJsonPaths.push(rootPackageJsonPath);
}

const dependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

for (const packageJsonPath of packageJsonPaths) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const isWorkspacePackage = packageJsonPath.indexOf(path.join(rootDir, 'packages') + path.sep) === 0;
  const isRootPackage = packageJsonPath === rootPackageJsonPath;

  if (isWorkspacePackage || isRootPackage) {
    pkg.version = nextVersion;
  }

  for (const field of dependencyFields) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') {
      continue;
    }
    for (const dependencyName of Object.keys(deps)) {
      if (internalPackageNames.has(dependencyName)) {
        deps[dependencyName] = nextVersion;
      }
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
}
NODE
}

ensure_no_untracked_files
ensure_no_unstaged_changes

if [ ! -f "$STATUS_FILE" ]; then
  echo "Missing .release-status.yml. Run 'yarn release:survey' first." >&2
  exit 1
fi

TARGET_VERSION="$(read_suggested_version)"
if [ -z "$TARGET_VERSION" ]; then
  echo "Could not read suggestedNextVersion from .release-status.yml" >&2
  exit 1
fi

if ! validate_semver "$TARGET_VERSION"; then
  echo "Invalid suggested version in .release-status.yml: $TARGET_VERSION" >&2
  exit 1
fi

echo "Preparing release $TARGET_VERSION"

if has_staged_changes; then
  echo "Creating snapshot commit for currently staged work"
  git -C "$ROOT_DIR" commit -m "chore: snapshot before release $TARGET_VERSION"
else
  echo "No staged changes found; skipping snapshot commit"
fi

echo "Updating package versions to $TARGET_VERSION"
update_package_versions "$TARGET_VERSION"

git -C "$ROOT_DIR" add package.json apps/*/package.json packages/*/package.json

if ! has_staged_changes; then
  echo "No version changes were staged; aborting." >&2
  exit 1
fi

git -C "$ROOT_DIR" commit -m "chore: release $TARGET_VERSION"

echo "Release preparation complete."
echo "Created commits:"
git -C "$ROOT_DIR" log --oneline -2
