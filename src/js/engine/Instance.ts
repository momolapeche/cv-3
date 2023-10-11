import { bindEvents, removeOwnerListeners } from './Events';
import { GameObject } from './GameObject';
import { Manager } from './Manager';
import { Engine } from './lib';

export class InstanceManager extends Manager {
  #nonInitializedGameObjects: Array<GameObject> = []
  #instantiatedGameObjects: Array<GameObject> = []

  update(): void {
    for (const gameObject of this.#nonInitializedGameObjects) {
      bindEvents(gameObject, gameObject);
      for (const component of gameObject.components) {
        bindEvents(component, gameObject);
      }

      gameObject._init();

      if (gameObject.parent === null) {
        Engine.gameObjects.push(gameObject)
      }

      this.#instantiatedGameObjects.push(gameObject);

      gameObject.emit('Init');

    }
    this.#nonInitializedGameObjects = [];
  }

  enterScene() {
    this.#instantiatedGameObjects = [];
    this.#nonInitializedGameObjects = [];
  }
  exitScene(): void {
    this.#nonInitializedGameObjects = [];
    for (const gameObject of this.#instantiatedGameObjects) {
      this.Destroy(gameObject);
    }
    this.#instantiatedGameObjects = [];
  }

  Instantiate<T extends GameObject>(gameObject: T): T {
    if (gameObject.instantiated) {
      console.error(
        `Error: GameObject[${gameObject.constructor.name}] already instantiated`
      );
    }
    this.#nonInitializedGameObjects.push(gameObject);
    gameObject.instantiated = true;
  
    // for (const child of gameObject.children) {
    //   this.Instantiate(child);
    // }
  
    return gameObject;
  }

  Destroy<T extends GameObject>(gameObject: T): void {
    if (gameObject.destroyed === true) {
      console.error('Error: Destroy called twice on same object');
    }
    // for (const child of gameObject.children) {
    //   this.Destroy(child);
    // }
    if (gameObject.instantiated === true && gameObject.initialized === false) {
      this.#nonInitializedGameObjects = this.#nonInitializedGameObjects.filter(go => go !== gameObject)
    }
    gameObject.emit('Destroy');

    if (gameObject.parent === null) {
      Engine.gameObjects.splice(Engine.gameObjects.indexOf(gameObject), 1)
    }
    else {
      console.log('Not Implemented')
    }

    gameObject._destroy();
    removeOwnerListeners(gameObject);
  
    const index = this.#instantiatedGameObjects.indexOf(gameObject)
    if (index !== -1) {
      this.#instantiatedGameObjects.splice(index, 1)
    }
    else {
      console.error("Error: Could not find GameObject")
    }
  }
}