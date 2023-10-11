import { Manager } from "./Manager";

export class TimeManager extends Manager {
  #deltaTime = 0;
  #time = 0;
  #then = 0;

  // #fps: number[] = Array(30)
  // #fpsIdx = 0

  enterScene() {
    this.#time = 0;
    this.#then = 0;
    this.#deltaTime = 0;
  }
  update(time: number) {
    this.#deltaTime = Math.min(1, time - this.#then);
    this.#time += this.#deltaTime;
    this.#then = time;

    // this.#fps[this.#fpsIdx] = 1. / this.#deltaTime
    // if (this.#fpsIdx === 29) {
    //   console.log('FPS:', this.#fps.reduce((acc, v) => acc + v / 30, 0))
    // }
    // this.#fpsIdx = (this.#fpsIdx + 1) % 30
  }
  get time() {
    return this.#time;
  }
  get deltaTime() {
    return this.#deltaTime;
  }
}