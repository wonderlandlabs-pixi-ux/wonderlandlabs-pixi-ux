// Pixi touches `navigator` at module init time; provide a minimal shim in non-browser runtimes.
if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'node' },
    configurable: true,
    writable: true,
  });
}
