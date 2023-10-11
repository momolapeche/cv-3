import { triggerEvent } from './Events';
import { Manager } from './Manager';

export class InputsManager extends Manager {
  keyboardState = new Set();
  keyboardPressed = new Set();
  mouse = {
    move: [0, 0],
    button: [false, false, false, false, false],
  };

  #keydownCallback = ((event: KeyboardEvent) => {
    if (!this.keyboardState.has(event.key)) {
      this.keyboardPressed.add(event.key)
      this.keyboardState.add(event.key)
      triggerEvent('OnKeyPressed', { event })
    }
  }).bind(this)
  #keyupCallback = ((event: KeyboardEvent) => {
    this.keyboardPressed.delete(event.key)
    this.keyboardState.delete(event.key)
  }).bind(this)

  constructor() {
    super()
    document.addEventListener('keydown', this.#keydownCallback)
    document.addEventListener('keyup', this.#keyupCallback)
  }
  Destructor(): void {
    document.removeEventListener('keydown', this.#keydownCallback)
    document.removeEventListener('keyup', this.#keyupCallback)
  }

  update(): void {
    this.mouse.move[0] = 0;
    this.mouse.move[1] = 0;
    this.mouse.button = this.mouse.button.map(() => false);
    this.keyboardPressed.clear();
  }

  get(k: string): boolean {
    return this.keyboardState.has(k);
  }
  getPressed(k: string): boolean {
    return this.keyboardPressed.has(k);
  }
  getButton(n: number): boolean {
    return this.mouse.button[n];
  }
  getMouseMoveX(): number {
    return this.mouse.move[0];
  }
  getMouseMoveY(): number {
    return this.mouse.move[1];
  }
}