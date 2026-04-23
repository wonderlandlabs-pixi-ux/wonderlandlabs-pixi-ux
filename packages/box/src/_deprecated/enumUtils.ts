export function dictToStringArray<const T extends Record<string, string>>(
  dictionary: T,
): [T[keyof T], ...Array<T[keyof T]>] {
  const values = [...new Set(Object.values(dictionary))] as Array<T[keyof T]>;
  if (!values.length) {
    throw new Error('dictionary must contain at least one value');
  }
  return values as [T[keyof T], ...Array<T[keyof T]>];
}
