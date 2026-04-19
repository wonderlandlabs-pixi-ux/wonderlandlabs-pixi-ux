import {ID_PATH_SEPARATOR} from './constants.js';
import type { BoxPixiOptions } from './types.js';
import { Container } from 'pixi.js';

export function drainKillList(options: BoxPixiOptions): void {
  const { store } = options;
  if (!store || store.killList.size === 0) {
    return;
  }

  const host = options.parentContainer ?? options.app?.stage;
  if (!host) {
    return;
  }

  for (const path of store.killList) {
    destroyRemovedContainer(path.split(ID_PATH_SEPARATOR), host);
  }
  store.clearKillList();
}

export function destroyRemovedContainer(
  ids: string[],
  host: Container,
): void {
  const container = findContainerByPath(ids, host);
  if (container?.parent) {
    container.parent.removeChild(container);
  }
  container?.destroy({ children: true });
}

export function findContainerByPath(
  ids: string[],
  host: Container,
): Container | undefined {
  return ids.reduce<Container | undefined>((current, id) => {
    const found = current?.getChildByLabel(id);
    return (found === null ? undefined : found);
  }, host);
}
