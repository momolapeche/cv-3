import { Manager } from './Manager';

export abstract class Scene {
    static Managers: Array<new (...args: unknown[]) => Manager> = []

    abstract Setup(data?: unknown): void | Promise<void>;
    Exit?(): void;
}