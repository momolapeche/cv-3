import { EventNames, Events } from './EventList';

let events: Map<
  keyof Events,
  Array<{ callback: (data: unknown) => void; owner: unknown }>
> = new Map();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindEvents(obj: any, owner: unknown): void {
  for (const event of EventNames) {
    if (event in obj.constructor.prototype) {
      addEventListener(event as keyof Events, obj[event].bind(obj), owner);
    }
  }
}

export function addEventListener<K extends keyof Events>(
  name: K,
  callback: (data: Events[K]) => void,
  owner: unknown
): void {
  const arr = events.get(name)
  if (arr === undefined) {
    events.set(name, [{ callback: callback as (data:unknown) => void, owner }]);
  }
  else {
    arr.push({ callback: callback as (data:unknown) => void, owner });
  }
}

export function removeOwnerListeners(owner: unknown): void {
  for (const [key, value] of events.entries()) {
    events.set(key, value.filter((c) => c.owner !== owner));
  }
}

export function triggerEvent<K extends keyof Events>(
  name: K, data?: Events[K]
): void {
  events.get(name)?.forEach((c) => c.callback(data));
}

export function resetEvents(): void {
  events = new Map()
}

export function deleteEvents(): void {
  resetEvents()
}

resetEvents()