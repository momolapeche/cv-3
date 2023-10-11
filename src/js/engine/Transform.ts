import { mat3, mat4, quat, vec3 } from "gl-matrix"

const tmpMat3 = mat3.create()

export class Transform {
    position = vec3.create()
    rotation = quat.create()
    scale = vec3.fromValues(1,1,1)
    matrix: Float32Array

    constructor(m: Float32Array) {
        this.matrix = m
    }

    getMatrix() {
        return mat4.fromRotationTranslationScale(this.matrix, this.rotation, this.position, this.scale)
    }
    getForward() {
        const v = vec3.fromValues(0, 0, -1)
        return vec3.transformQuat(v, v, this.rotation)
    }
    lookAt(eye: vec3, center: vec3, up: vec3) {
        mat4.targetTo(this.matrix, eye, center, up)
        mat3.fromMat4(tmpMat3, this.matrix)
        quat.fromMat3(this.rotation, tmpMat3)

        vec3.copy(this.position, eye)

    }
}

const INIT_POOL_SIZE = 2
export class TransformManager {
    private pool: Transform[]
    private notInUse: Transform[]

    private buffer: ArrayBuffer

    constructor() {
        this.buffer = new ArrayBuffer(INIT_POOL_SIZE * 16 * 4)
        this.pool = Array(INIT_POOL_SIZE).fill(null).map((_, i) => new Transform(new Float32Array(this.buffer, i * 16 * 4, 16)))
        this.notInUse = this.pool.slice()
    }

    get(): Transform {
        if (this.notInUse.length > 0) {
            return this.notInUse.pop()!
        }
        else {
            console.info('Expanding Transform Pool')
            const offset = this.pool.length
            const b = new ArrayBuffer(this.pool.length * 2 * 4 * 16)
            const dst = new Float32Array(b)
            const src = new Float32Array(this.buffer)
            dst.set(src)
            this.buffer = b
            this.pool.forEach((t, i) => {
                t.matrix = new Float32Array(this.buffer, i * 16 * 4, 16)
            })
            
            const app = Array(this.pool.length).fill(null).map((_, i) => new Transform(new Float32Array(this.buffer, (i + offset) * 16 * 4, 16)))
            this.pool = this.pool.concat(app)
            this.notInUse = this.notInUse.concat(app)

            return this.notInUse.pop()!
        }
    }
    free(t: Transform) {
        this.notInUse.push(t)
    }
}






