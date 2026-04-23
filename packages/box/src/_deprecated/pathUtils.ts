export type Path = string | string[];

function toPathArray(p: Path): string[] {
  if (Array.isArray(p)) {
    return p;
  }
  if (typeof p === 'string') {
    return p.split('.');
  }
  throw new Error('cannot parse path');
}

export function pathString(path: Path): string {
  return Array.isArray(path) ? path.join('.') : `${path}`;
}

export function pathToString(path: Path): string {
  return pathString(path);
}

export function combinePaths(p: Path, p2: Path): string[] {
  if (!Array.isArray(p)) {
    return combinePaths(toPathArray(p), p2);
  }

  if (!Array.isArray(p2)) {
    return combinePaths(p, toPathArray(p2));
  }

  if (!p.length) {
    return p2 as string[];
  }
  if (!p2.length) {
    return p as string[];
  }
  return [...p, ...p2];
}

export default combinePaths;
