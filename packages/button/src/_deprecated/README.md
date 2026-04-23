The previous monolithic `ButtonStore` implementation was retired during the rewrite that split the live code into:

- `ButtonStore.ts`
- `buttonContent.ts`
- `buttonRenderers.ts`
- `buttonStyleBridge.ts`
- `buttonInternals.ts`

The archived source is kept in this folder with `.bak` suffixes so it remains in-repo without participating in the live TypeScript build.
