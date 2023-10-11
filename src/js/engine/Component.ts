import { GameObject } from "./GameObject";

export abstract class Component {
    [key: string]: unknown;
    readonly parent: GameObject;

    constructor(parent: GameObject) {
        this.parent = parent
    }
}
