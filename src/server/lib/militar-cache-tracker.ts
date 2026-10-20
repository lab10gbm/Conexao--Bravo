import { EventEmitter } from 'events';

declare global {
  var militarCacheVersion: number | undefined;
  var militarCacheEmitter: EventEmitter | undefined;
}

if (!globalThis.militarCacheVersion) {
  globalThis.militarCacheVersion = 1;
}
if (!globalThis.militarCacheEmitter) {
  globalThis.militarCacheEmitter = new EventEmitter();
  globalThis.militarCacheEmitter.setMaxListeners(100);
}

export const militarEvents = globalThis.militarCacheEmitter;

export function getMilitarCacheVersion(): number {
  return globalThis.militarCacheVersion || 1;
}

export function bumpMilitarCacheVersion(): number {
  globalThis.militarCacheVersion = (globalThis.militarCacheVersion || 1) + 1;
  globalThis.militarCacheEmitter.emit('update', globalThis.militarCacheVersion);
  return globalThis.militarCacheVersion;
}
