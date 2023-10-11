import { Component } from './Component';
import { GameObjectEventNames, GameObjectEvents } from './EventList';
import { Engine } from './lib';
import { Transform } from './Transform';

class GameObjectListener {
    target: GameObject
    event: string
    callback: (data: unknown) => void

    constructor(target: GameObject, event: string, callback: (data: unknown) => void) {
        this.target = target
        this.event = event
        this.callback = callback
    }
}

export class GameObject {
  [key: string]: unknown;
  initialized = false;
  instantiated = false;
  destroyed = false;

  transform: Transform

  private eventCallbacks: Record<string, Array<(data: unknown) => void>> = {};

  components: Map<new (...args: any[]) => Component, Component> = new Map();

  readonly parent: GameObject | null = null;

  constructor() {
    this.transform = Engine.Transform.get()
  }

  static createListener<K extends keyof GameObjectEvents>(target: GameObject, event: K, callback: (data: GameObjectEvents[K]) => void) {
      const listener = new GameObjectListener(target, event, callback as (data: unknown) => void)
      target.addEventCallback(event, callback)
      return listener
  }
  static destroyListener(listener: GameObjectListener) {
      listener.target.removeEventCallback(listener.event, listener.callback)
  }

  _init(): void {
    this.initialized = true;

    for (const eventId of GameObjectEventNames) {
      if (this.constructor.prototype[eventId]) {
        const callback = (this[eventId] as () => void).bind(this)
        this.addEventCallback(eventId, callback)
      }
      this.components.forEach(component => {
        if (component.constructor.prototype[eventId]) {
          const callback = (component[eventId] as () => void).bind(component)
          this.addEventCallback(eventId, callback)
        }
      })
    }
  }
  _destroy(): void {
    this.destroyed = true
    this.events = {}
    this.eventCallbacks = {}
    Engine.Transform.free(this.transform)
  }

  private addEventCallback<K extends keyof GameObjectEvents>(name: K, callback: (data: GameObjectEvents[K]) => void) {
    if (this.eventCallbacks[name] === undefined) {
      this.eventCallbacks[name] = [ callback as (data: unknown) => void]
    }
    else {
      this.eventCallbacks[name].push(callback as (data: unknown) => void)
    }
  }

  private removeEventCallback(name: string, callback: (data: unknown) => void) {
      const list = this.eventCallbacks[name]
      const index = list.indexOf(callback)
      if (index !== -1) {
          list.splice(index, 1)
      }
  }

  addComponent<T extends Component>(component: T): T {
    // DEBUG
    if (this.instantiated) {
      console.error('Cannot add Component on an already instantiated GameObject')
    }
    this.components.set(component.constructor as new (...args: any[]) => T, component);
    return component
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getComponent<T extends Component>(type: new (...args: any[]) => T): T {
    return this.components.get(type) as T;
  }

  emit<K extends keyof GameObjectEvents>(eventId: K, data?: GameObjectEvents[K]): void {
    // TODO: Remove at some point
    if (this.destroyed || (this.instantiated && !this.initialized)) {
      if (this.destroyed)
        console.error('An event was emited on an already destroyed GameObject')
      else
        console.error('An event was emited on an uninitialized GameObject')
      return
    }
    this.eventCallbacks[eventId]?.forEach(c => c(data));
  }

  get getParent(): GameObject | null {
    return this.parent
  }
}
