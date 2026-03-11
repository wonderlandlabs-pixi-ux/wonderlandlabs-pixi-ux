#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$ROOT_DIR/.release-status.yml"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required" >&2
  exit 1
fi

PACKAGE_INFO_FILE="$(mktemp)"
STATUS_INPUT_FILE="$(mktemp)"
PUBLISH_ORDER_FILE="$(mktemp)"

cleanup() {
  rm -f "$PACKAGE_INFO_FILE" "$STATUS_INPUT_FILE" "$PUBLISH_ORDER_FILE"
}

trap cleanup EXIT

discover_packages() {
  node - "$ROOT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const packagesDir = path.join(rootDir, 'packages');
const dirs = fs.readdirSync(packagesDir).sort();

for (const dirName of dirs) {
  const packageJsonPath = path.join(packagesDir, dirName, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    continue;
  }
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  process.stdout.write([
    pkg.name,
    pkg.version || '',
    path.join(packagesDir, dirName),
    packageJsonPath,
  ].join('\t') + '\n');
}
NODE
}

extract_highest_semver() {
  node -e '
const input = require("fs").readFileSync(0, "utf8").trim();
if (!input) {
  process.stdout.write("");
  process.exit(0);
}

let parsed;
try {
  parsed = JSON.parse(input);
} catch (_error) {
  process.stdout.write("");
  process.exit(0);
}

const versions = Array.isArray(parsed) ? parsed : [parsed];

function parseSemver(version) {
  const match = String(version).trim().match(
    /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/
  );
  if (!match) {
    return null;
  }
  return {
    raw: String(version).trim(),
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^[0-9]+$/.test(left);
  const rightNumeric = /^[0-9]+$/.test(right);
  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }
  if (leftNumeric) {
    return -1;
  }
  if (rightNumeric) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareSemver(leftRaw, rightRaw) {
  const left = parseSemver(leftRaw);
  const right = parseSemver(rightRaw);
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  if (left.patch !== right.patch) {
    return left.patch - right.patch;
  }

  const leftPre = left.prerelease;
  const rightPre = right.prerelease;
  if (leftPre.length === 0 && rightPre.length === 0) {
    return 0;
  }
  if (leftPre.length === 0) {
    return 1;
  }
  if (rightPre.length === 0) {
    return -1;
  }

  const maxLength = Math.max(leftPre.length, rightPre.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftId = leftPre[index];
    const rightId = rightPre[index];
    if (leftId === undefined) {
      return -1;
    }
    if (rightId === undefined) {
      return 1;
    }
    const comparison = compareIdentifiers(leftId, rightId);
    if (comparison !== 0) {
      return comparison;
    }
  }

  return 0;
}

let highest = "";
for (const version of versions) {
  if (!highest || compareSemver(version, highest) > 0) {
    highest = version;
  }
}

process.stdout.write(highest);
'
}

compute_suggested_version() {
  node - "$1" <<'NODE'
const current = process.argv[2];
if (!current) {
  process.stdout.write('0.0.1');
  process.exit(0);
}

const match = current.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-.+)?(?:\+.+)?$/);
if (!match) {
  process.stdout.write(current);
  process.exit(0);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]) + 1;
process.stdout.write([major, minor, patch].join('.'));
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

discover_packages > "$PACKAGE_INFO_FILE"

if [ ! -s "$PACKAGE_INFO_FILE" ]; then
  echo "No workspace packages found under $ROOT_DIR/packages" >&2
  exit 1
fi

GLOBAL_REMOTE_HIGHEST=""

while IFS="$(printf '\t')" read -r package_name local_version package_dir package_json_path; do
  remote_versions_json="$(npm view "$package_name" versions --json 2>/dev/null || true)"
  remote_highest="$(printf '%s' "$remote_versions_json" | extract_highest_semver)"
  if [ -z "$remote_highest" ]; then
    remote_highest=""
  fi

  publish_exists="false"
  if [ -n "$remote_highest" ]; then
    publish_exists="true"
    GLOBAL_REMOTE_HIGHEST="$(node - "$GLOBAL_REMOTE_HIGHEST" "$remote_highest" <<'NODE'
function parseSemver(version) {
  const match = String(version).trim().match(
    /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/
  );
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^[0-9]+$/.test(left);
  const rightNumeric = /^[0-9]+$/.test(right);
  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }
  if (leftNumeric) {
    return -1;
  }
  if (rightNumeric) {
    return 1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function compareSemver(leftRaw, rightRaw) {
  const left = parseSemver(leftRaw);
  const right = parseSemver(rightRaw);
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return -1;
  }
  if (!right) {
    return 1;
  }
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  if (left.patch !== right.patch) {
    return left.patch - right.patch;
  }

  const leftPre = left.prerelease;
  const rightPre = right.prerelease;
  if (leftPre.length === 0 && rightPre.length === 0) {
    return 0;
  }
  if (leftPre.length === 0) {
    return 1;
  }
  if (rightPre.length === 0) {
    return -1;
  }
  const maxLength = Math.max(leftPre.length, rightPre.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftId = leftPre[index];
    const rightId = rightPre[index];
    if (leftId === undefined) {
      return -1;
    }
    if (rightId === undefined) {
      return 1;
    }
    const comparison = compareIdentifiers(leftId, rightId);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return 0;
}

const current = process.argv[2];
const next = process.argv[3];
if (!current) {
  process.stdout.write(next);
} else {
  process.stdout.write(compareSemver(next, current) > 0 ? next : current);
}
NODE
)"
  fi

  printf "%s\t%s\t%s\t%s\t%s\t%s\n" \
    "$package_name" \
    "$local_version" \
    "$package_dir" \
    "$package_json_path" \
    "$remote_highest" \
    "$publish_exists" >> "$STATUS_INPUT_FILE"
done < "$PACKAGE_INFO_FILE"

compute_publish_order > "$PUBLISH_ORDER_FILE"
SUGGESTED_VERSION="$(compute_suggested_version "$GLOBAL_REMOTE_HIGHEST")"

node - "$ROOT_DIR" "$STATUS_INPUT_FILE" "$PUBLISH_ORDER_FILE" "$STATUS_FILE" "$GLOBAL_REMOTE_HIGHEST" "$SUGGESTED_VERSION" <<'NODE'
const fs = require('fs');
const path = require('path');

const rootDir = process.argv[2];
const statusInputPath = process.argv[3];
const publishOrderPath = process.argv[4];
const statusFilePath = process.argv[5];
const highestPublishedVersion = process.argv[6] || '';
const suggestedVersion = process.argv[7] || '';

function yamlString(value) {
  const normalized = String(value ?? '');
  return JSON.stringify(normalized);
}

function relativePath(filePath) {
  const relative = path.relative(rootDir, filePath);
  return relative || '.';
}

const packageLines = fs.readFileSync(statusInputPath, 'utf8')
  .split('\n')
  .filter(Boolean);
const orderLines = fs.readFileSync(publishOrderPath, 'utf8')
  .split('\n')
  .filter(Boolean);

const packages = packageLines.map((line) => {
  const [name, localVersion, dir, packageJsonPath, npmHighestVersion, published] = line.split('\t');
  return {
    name,
    localVersion,
    dir,
    packageJsonPath,
    npmHighestVersion,
    published: published === 'true',
  };
});

const publishOrder = orderLines.map((dirPath) => {
  const match = packages.find((pkg) => pkg.dir === dirPath);
  return {
    dir: dirPath,
    name: match ? match.name : path.basename(dirPath),
  };
});

const lines = [];
lines.push('# Generated by scripts/release-survey.sh');
lines.push('generatedAtUtc: ' + yamlString(new Date().toISOString()));
lines.push('workspaceRoot: ' + yamlString(rootDir));
lines.push('highestPublishedVersion: ' + yamlString(highestPublishedVersion || '<none>'));
lines.push('suggestedNextVersion: ' + yamlString(suggestedVersion));
lines.push('packageCount: ' + packages.length);
lines.push('packages:');

for (const pkg of packages) {
  lines.push('  - name: ' + yamlString(pkg.name));
  lines.push('    localVersion: ' + yamlString(pkg.localVersion));
  lines.push('    npmHighestVersion: ' + yamlString(pkg.npmHighestVersion || '<unpublished>'));
  lines.push('    published: ' + (pkg.published ? 'true' : 'false'));
  lines.push('    dir: ' + yamlString(relativePath(pkg.dir)));
  lines.push('    packageJson: ' + yamlString(relativePath(pkg.packageJsonPath)));
}

lines.push('publishOrder:');
for (const entry of publishOrder) {
  lines.push('  - name: ' + yamlString(entry.name));
  lines.push('    dir: ' + yamlString(relativePath(entry.dir)));
}

fs.writeFileSync(statusFilePath, lines.join('\n') + '\n');
NODE

echo "Wrote $(basename "$STATUS_FILE")"
echo "Highest published version: ${GLOBAL_REMOTE_HIGHEST:-<none>}"
echo "Suggested next version: $SUGGESTED_VERSION"
