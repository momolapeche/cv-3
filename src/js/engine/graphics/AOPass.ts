import { mat4, vec3 } from "gl-matrix"
import { ALBEDO_INDEX, DEPTH_INDEX, FREE_INDEX0, NORMAL_INDEX, POSITION_INDEX } from "../Graphics"
import { Engine } from "../lib"
import { createProgram } from "./utils"

function lerp(a: number, b: number, s: number) {
    return a + s * (b - a)
}
export class SSAOPass {
    #gl: WebGL2RenderingContext

    #framebuffer: WebGLFramebuffer
    output: WebGLTexture

    #program: WebGLProgram
    #uVPLocation: WebGLUniformLocation
    #uVLocation: WebGLUniformLocation

    #numSamples: number
    #randomVecs: vec3[]
    #ditherVecs: WebGLTexture

    constructor(gl: WebGL2RenderingContext) {
        this.#gl = gl

        this.#framebuffer = gl.createFramebuffer() as WebGLFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebuffer)

        this.output = gl.createTexture() as WebGLTexture
        gl.bindTexture(gl.TEXTURE_2D, this.output)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.FLOAT, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.output, 0)

        {
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error("Error: Incomplete Framebuffer: ", status)
            }
        }

        this.#program = createProgram(
            gl,
            [
                Engine.Graphics.shaders.getShader('basicVS'),
                Engine.Graphics.shaders.compileShader('aoFS', {type: 'fragment'}),
            ]
        )

        gl.useProgram(this.#program)
        this.#uVPLocation = gl.getUniformLocation(this.#program, 'uVP') as WebGLUniformLocation
        this.#uVLocation = gl.getUniformLocation(this.#program, 'uV') as WebGLUniformLocation
        gl.uniform1i(gl.getUniformLocation(this.#program, 'uDepth'), DEPTH_INDEX)
        gl.uniform1i(gl.getUniformLocation(this.#program, 'uPosition'), POSITION_INDEX)
        gl.uniform1i(gl.getUniformLocation(this.#program, 'uNormal'), NORMAL_INDEX)
        gl.uniform1i(gl.getUniformLocation(this.#program, 'uAlbedo'), ALBEDO_INDEX)

        gl.uniform1i(gl.getUniformLocation(this.#program, 'uDither'), FREE_INDEX0)

        gl.uniform1f(gl.getUniformLocation(this.#program, 'uRadius'), 1)

        const ditherTexSize = 16
        const ditherVecsData = new Float32Array(ditherTexSize*ditherTexSize)
        for (let i = 0; i < ditherTexSize*ditherTexSize; i++) {
            ditherVecsData[i] = Math.random() * Math.PI * 2
        }
        this.#ditherVecs = gl.createTexture() as WebGLTexture
        gl.bindTexture(gl.TEXTURE_2D, this.#ditherVecs)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, ditherTexSize, ditherTexSize, 0, gl.RED, gl.FLOAT, ditherVecsData)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
        
        this.#numSamples = 64
        this.#randomVecs = Array(this.#numSamples)
        for (let i = 0; i < this.#numSamples; i++) {
            const v = vec3.random(vec3.create())

            let scale = i / this.#numSamples
            // scale = lerp(0.1, 1, scale*scale)
            scale *= scale
            vec3.scale(v, v, scale)

            this.#randomVecs[i] = v
            gl.uniform3fv(gl.getUniformLocation(this.#program, 'uSamples['+i+']'), v)
        }
    }
    pass(viewProjectionMatrix: mat4, viewMatrix: mat4) {
        const gl = this.#gl

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebuffer)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(this.#program)
        gl.activeTexture(gl.TEXTURE0 + FREE_INDEX0)
        gl.bindTexture(gl.TEXTURE_2D, this.#ditherVecs)
        gl.uniformMatrix4fv(this.#uVPLocation, false, viewProjectionMatrix)
        gl.uniformMatrix4fv(this.#uVLocation, false, viewMatrix)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
}
