/****************
//
//  all from SIGGRAPH 2014 Advances in Real-Time Rendering in Games
//  http://www.iryoku.com/next-generation-post-processing-in-call-of-duty-advanced-warfare
//
****************/

import { FREE_INDEX0 } from "../Graphics"
import { compileShader, createProgram } from "./utils"

const vDownSampleSrc = `#version 300 es

precision highp float;

out vec2 vTexCoords;

void main() {
    float x = float(gl_VertexID % 2);
    float y = float(gl_VertexID / 2);

    vTexCoords = vec2(x, y);

    gl_Position = vec4(x * 2. - 1., y * 2. - 1., 0, 1);
}
`

const downSample13 = `
vec4 sample13(in sampler2D uTex, in vec2 uv, in vec2 texelSize) {
    return (texture(uTex, uv) * 0.5 +
        texture(uTex, uv + texelSize * vec2( 1,  1)) * 0.5 +
        texture(uTex, uv + texelSize * vec2( 1, -1)) * 0.5 +
        texture(uTex, uv + texelSize * vec2(-1,  1)) * 0.5 +
        texture(uTex, uv + texelSize * vec2(-1, -1)) * 0.5 +

        texture(uTex, uv + texelSize * vec2( 2,  0)) * 0.25 +
        texture(uTex, uv + texelSize * vec2(-2,  0)) * 0.25 +
        texture(uTex, uv + texelSize * vec2( 0,  2)) * 0.25 +
        texture(uTex, uv + texelSize * vec2( 0, -2)) * 0.25 +

        texture(uTex, uv + texelSize * vec2( 2,  2)) * 0.125 +
        texture(uTex, uv + texelSize * vec2( 2, -2)) * 0.125 +
        texture(uTex, uv + texelSize * vec2(-2,  2)) * 0.125 +
        texture(uTex, uv + texelSize * vec2(-2, -2)) * 0.125
    ) * 0.25;
}
`

const fDownSample0Src = `#version 300 es

precision highp float;

uniform sampler2D uTex;
uniform vec2 uTexelSize;

in vec2 vTexCoords;

out vec4 oColor;

${downSample13}

void main() {
    oColor = vec4(max(vec3(0), sample13(uTex, vTexCoords, uTexelSize).rgb - 1.), 1);
}
`

const fDownSampleSrc = `#version 300 es

precision highp float;

uniform sampler2D uTex;
uniform vec2 uTexelSize;

in vec2 vTexCoords;

out vec4 oColor;

${downSample13}

void main() {
    oColor = vec4(sample13(uTex, vTexCoords, uTexelSize).rgb, 1);
}
`

const fUpScaleSrc = `#version 300 es

precision highp float;

uniform sampler2D uTex;
uniform float uFactor;
uniform vec2 uTexelSize;

in vec2 vTexCoords;

out vec4 oColor;

void main() {
    vec4 t = texture(uTex, vTexCoords) * 4. +
        texture(uTex, vTexCoords + vec2(uTexelSize.x, 0)) * 2. +
        texture(uTex, vTexCoords - vec2(uTexelSize.x, 0)) * 2. +
        texture(uTex, vTexCoords + vec2(0, uTexelSize.y)) * 2. +
        texture(uTex, vTexCoords - vec2(0, uTexelSize.y)) * 2. +
        texture(uTex, vTexCoords + vec2( uTexelSize.x,  uTexelSize.y)) +
        texture(uTex, vTexCoords + vec2( uTexelSize.x, -uTexelSize.y)) +
        texture(uTex, vTexCoords + vec2(-uTexelSize.x,  uTexelSize.y)) +
        texture(uTex, vTexCoords + vec2(-uTexelSize.x, -uTexelSize.y));
    oColor = vec4(t.xyz / 16., 1) * uFactor;
}
`

export class BloomPass {
    private gl: WebGL2RenderingContext
    private fb: WebGLFramebuffer
    private texs: WebGLTexture[] = []
    private texsDimensions: [number, number][] = []

    private downSample0Program: WebGLProgram
    private downSampleProgram: WebGLProgram
    private upscaleProgram: WebGLProgram
    private uTexUpscaleLocation: WebGLUniformLocation
    private uTexelSizeUpscaleLocation: WebGLUniformLocation
    private uTex0Location: WebGLUniformLocation
    private uTexelSize0Location: WebGLUniformLocation
    private uTexLocation: WebGLUniformLocation
    private uTexelSizeLocation: WebGLUniformLocation
    private uFactorLocation: WebGLUniformLocation

    private numIter = 5

    private width: number
    private height: number

    constructor(gl: WebGL2RenderingContext, width: number, height: number) {
        this.gl = gl
        this.width = width
        this.height = height


        this.downSample0Program = createProgram(gl, [
            compileShader(gl, vDownSampleSrc, 'vertex'),
            compileShader(gl, fDownSample0Src, 'fragment'),
        ])
        gl.useProgram(this.downSample0Program)
        this.uTex0Location = gl.getUniformLocation(this.downSample0Program, 'uTex') as WebGLUniformLocation
        this.uTexelSize0Location = gl.getUniformLocation(this.downSample0Program, 'uTexelSize') as WebGLUniformLocation
        gl.uniform1i(this.uTex0Location, FREE_INDEX0)

        this.downSampleProgram = createProgram(gl, [
            compileShader(gl, vDownSampleSrc, 'vertex'),
            compileShader(gl, fDownSampleSrc, 'fragment'),
        ])
        gl.useProgram(this.downSampleProgram)
        this.uTexLocation = gl.getUniformLocation(this.downSampleProgram, 'uTex') as WebGLUniformLocation
        this.uTexelSizeLocation = gl.getUniformLocation(this.downSampleProgram, 'uTexelSize') as WebGLUniformLocation
        gl.uniform1i(this.uTexLocation, FREE_INDEX0)

        this.upscaleProgram = createProgram(gl, [
            compileShader(gl, vDownSampleSrc, 'vertex'),
            compileShader(gl, fUpScaleSrc, 'fragment'),
        ])
        gl.useProgram(this.upscaleProgram)
        this.uTexUpscaleLocation = gl.getUniformLocation(this.upscaleProgram, 'uTex') as WebGLUniformLocation
        this.uFactorLocation = gl.getUniformLocation(this.upscaleProgram, 'uFactor') as WebGLUniformLocation
        this.uTexelSizeUpscaleLocation = gl.getUniformLocation(this.upscaleProgram, 'uTexelSize') as WebGLUniformLocation
        gl.uniform1i(this.uTexUpscaleLocation, FREE_INDEX0)



        this.fb = gl.createFramebuffer() as WebGLFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb)
        gl.drawBuffers([gl.COLOR_ATTACHMENT0])

        for (let i = 0; i < this.numIter; i++) {
            this.texs[i] = gl.createTexture() as WebGLTexture
            gl.bindTexture(gl.TEXTURE_2D, this.texs[i])
            const texWidth = width >> (i + 1)
            const texHeight = height >> (i + 1)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, texWidth, texHeight, 0, gl.RGBA, gl.FLOAT, null)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            this.texsDimensions[i] = [texWidth, texHeight]
        }
    }

    pass(input: WebGLTexture, output: WebGLTexture) {
        const gl = this.gl

        gl.useProgram(this.downSample0Program)
        gl.uniform2f(this.uTexelSize0Location, 1 / this.width, 1 / this.height)

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texs[0], 0)
        gl.viewport(0, 0, this.texsDimensions[0][0], this.texsDimensions[0][1])

        gl.activeTexture(gl.TEXTURE0 + FREE_INDEX0)
        gl.bindTexture(gl.TEXTURE_2D, input)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)


        gl.useProgram(this.downSampleProgram)
        for (let i = 1; i < this.numIter; i++) {
            gl.uniform2f(this.uTexelSizeLocation, 1 / this.texsDimensions[i-1][0], 1 / this.texsDimensions[i-1][1])

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texs[i], 0)
            gl.viewport(0, 0, this.texsDimensions[i][0], this.texsDimensions[i][1])

            gl.activeTexture(gl.TEXTURE0 + FREE_INDEX0)
            gl.bindTexture(gl.TEXTURE_2D, this.texs[i - 1])

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }

        gl.useProgram(this.upscaleProgram)
        gl.uniform1f(this.uFactorLocation, 1)
        gl.enable(gl.BLEND)
        for (let i = this.numIter - 1; i >= 0; i--) {
            gl.uniform2f(this.uTexelSizeUpscaleLocation, 1 / this.texsDimensions[i][0], 1 / this.texsDimensions[i][1])
            if (i === 0) {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0)
                gl.uniform1f(this.uFactorLocation, 1/this.numIter)
                gl.viewport(0, 0, this.width, this.height)
            }
            else {
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texs[i - 1], 0)
                gl.viewport(0, 0, this.texsDimensions[i - 1][0], this.texsDimensions[i - 1][1])
            }

            gl.activeTexture(gl.TEXTURE0 + FREE_INDEX0)
            gl.bindTexture(gl.TEXTURE_2D, this.texs[i])

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        }
        gl.disable(gl.BLEND)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
}
