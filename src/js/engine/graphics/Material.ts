import { mat4, vec3 } from "gl-matrix"
import { Engine } from "../lib"

export type Material = {
    vertexShader: string,
    fragmentShader: string,
    defines: Record<string, string>,
    uniforms: Record<string, 
        { type: 'float', value: Float32Array } |
        { type: 'vec3', value: Float32Array } |
        { type: 'mat4', value: Float32Array }
    >,
}

export class MaterialFactory {
    private gl: WebGL2RenderingContext
    private material: Material

    constructor(gl: WebGL2RenderingContext, vertexShaderSource: string, fragmentShaderSource: string) {
        this.gl = gl

        this.material = {
            vertexShader: vertexShaderSource,
            fragmentShader: fragmentShaderSource,
            defines: {},
            uniforms: {
                uTransform: { type: 'mat4', value: new Float32Array(16) },
                uCamera: { type: 'mat4', value: new Float32Array(16) },
                uProjection: { type: 'mat4', value: new Float32Array(16) },
                uMetalness: { type: 'float', value: new Float32Array([0.5]) },
                uRoughness: { type: 'float', value: new Float32Array([0.5]) },
            },
        }
    }
    useColorAttribute() {
        this.material.defines['USE_COLOR_ATTRIBUTE'] = ''
        return this
    }
    useColor(color: Float32Array | vec3) {
        this.material.uniforms['uColor'] = { type: 'vec3', value: color as Float32Array }
        this.material.defines['USE_COLOR'] = ''
        return this
    }
    useNormals() {
        this.material.defines['NORMAL'] = ''
        return this
    }
    useEmission(color: Float32Array | vec3) {
        this.material.uniforms['uEmission'] = { type: 'vec3', value: color as Float32Array }
        this.material.defines['USE_EMISSION'] = ''
        return this
    }

    setMetalness(v: number) {
        this.material.uniforms.uMetalness.value[0] = v
        return this
    }

    setRoughness(v: number) {
        this.material.uniforms.uRoughness.value[0] = v
        return this
    }

    build(): Material {
        return this.material
    }
}
