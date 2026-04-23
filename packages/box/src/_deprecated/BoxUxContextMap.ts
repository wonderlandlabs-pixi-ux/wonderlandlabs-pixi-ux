export class MapEnhanced extends Map<string, unknown> {
    getOrMake<T, TArgs extends unknown[] = []>(
        layer: string,
        factory: (key: string, ...args: TArgs) => T,
        ...args: TArgs
    ): T {
        if (this.has(layer)) {
            return this.get(layer) as T;
        }
        const value = factory(layer, ...args);
        this.set(layer, value);

        return value as T;
    }
}
