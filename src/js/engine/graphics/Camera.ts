import { mat4 } from "gl-matrix";
import { Component } from "../Component";
import { GameObject } from "../GameObject";
import { Transform } from "../Transform";

export class CameraComponent extends Component {
    readonly projection: mat4
    transform: Transform
    private matrix: mat4

    constructor(parent: GameObject, projection: mat4) {
        super(parent)

        this.projection = projection
        this.transform = this.parent.transform
        this.matrix = mat4.create()
    }
    getVueMatrix() {
        const m = this.transform.getMatrix()
        this.matrix[0] = m[0]
        this.matrix[1] = m[4]
        this.matrix[2] = m[8]
        this.matrix[3] = 0
        this.matrix[4] = m[1]
        this.matrix[5] = m[5]
        this.matrix[6] = m[9]
        this.matrix[7] = 0
        this.matrix[8] = m[2]
        this.matrix[9] = m[6]
        this.matrix[10] = m[10]
        this.matrix[11] = 0
        this.matrix[12] = -(m[0]*m[12] + m[1]*m[13] + m[2]*m[14])
        this.matrix[13] = -(m[4]*m[12] + m[5]*m[13] + m[6]*m[14])
        this.matrix[14] = -(m[8]*m[12] + m[9]*m[13] + m[10]*m[14])
        this.matrix[15] = 1
        return this.matrix
    }
}
