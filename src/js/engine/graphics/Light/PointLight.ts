import { vec3 } from "gl-matrix"
import { Component } from "../../Component"
import { GameObject } from "../../GameObject"
import { Engine } from "../../lib"
import { Transform } from "../../Transform"
import { bindGBuffer, createProgram } from "../utils"

export type PointLightOptions = {
    color: vec3
    intensity: number
    radius: number
}

export class PointLightComponent extends Component {
    private gl: WebGL2RenderingContext

    private position: vec3 = <vec3><unknown>null
    private color: vec3
    private intensity: Float32Array
    private radius: Float32Array

    private program: WebGLProgram
    private uniformLocations: Record<string, WebGLUniformLocation> = {}

    constructor(parent: GameObject, options: PointLightOptions) {
        super(parent)

        this.gl = Engine.Graphics.context
        const gl = this.gl

        this.program = createProgram(gl, [Engine.Graphics.shaders.getShader('pointLightVS'), Engine.Graphics.shaders.getShader('pointLightFS')])
        ;['uCameraPosition', 'uLightPosition', 'uLightColor', 'uLightIntensity', 'uLightRadius',].forEach(n => {
            this.uniformLocations[n] = gl.getUniformLocation(this.program, n) as WebGLUniformLocation
        })

        bindGBuffer(gl, this.program)

        this.radius = new Float32Array([options.radius])
        this.intensity = new Float32Array([options.intensity])

        this.color = options.color
    }
    Init() {
        this.position = this.parent.transform.position
        Engine.Graphics.lightManager.addLight(this)
    }
    Destroy() {
        Engine.Graphics.lightManager.removeLight(this)
    }
    render(cameraPosition: vec3) {
        const gl = this.gl

        gl.useProgram(this.program)
        gl.uniform3fv(this.uniformLocations['uCameraPosition'], cameraPosition)
        gl.uniform3fv(this.uniformLocations['uLightPosition'], this.position)
        gl.uniform3fv(this.uniformLocations['uLightColor'], this.color)
        gl.uniform1fv(this.uniformLocations['uLightIntensity'], this.intensity)
        gl.uniform1fv(this.uniformLocations['uLightRadius'], this.radius)

        gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    }

    getRadius() {
        return this.radius[0]
    }
}

export class InstancedPointLightComponent extends Component {
    private gl: WebGL2RenderingContext

    private program: WebGLProgram
    readonly buffers: Record<string, WebGLBuffer> = {}
    private attributeIndices: Record<string, number> = {}
    private uniformLocations: Record<string, WebGLUniformLocation> = {}

    private position: vec3 | null = null
    private count: number

    private vao: WebGLVertexArrayObject

    constructor(parent: GameObject, options: PointLightOptions, count: number, data: { positions: Float32Array, colors: Float32Array, intensities: Float32Array, radii: Float32Array }) {
        super(parent)

        this.gl = Engine.Graphics.context
        const gl = this.gl

        this.program = createProgram(gl, [
            Engine.Graphics.shaders.compileShader('pointLightVS', { type: 'vertex', defines: { INSTANCED: '' } }),
            Engine.Graphics.shaders.getShader('pointLightFS')
        ])
        ;['uCameraPosition', 'uLightPosition'].forEach(n => {
            this.uniformLocations[n] = gl.getUniformLocation(this.program, n) as WebGLUniformLocation
        })
        ;['aLightLocalPosition', 'aLightColor', 'aLightIntensity', 'aLightRadius'].forEach(n => {
            this.attributeIndices[n] = gl.getAttribLocation(this.program, n)
        })

        this.vao = gl.createVertexArray() as WebGLVertexArrayObject

        gl.bindVertexArray(this.vao)

        this.buffers['position'] = gl.createBuffer() as WebGLBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['position'])
        gl.bufferData(gl.ARRAY_BUFFER, data.positions, gl.DYNAMIC_COPY)
        gl.enableVertexAttribArray(this.attributeIndices['aLightLocalPosition'])
        gl.vertexAttribPointer(this.attributeIndices['aLightLocalPosition'], 3, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(this.attributeIndices['aLightLocalPosition'], 1)

        this.buffers['color'] = gl.createBuffer() as WebGLBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['color'])
        gl.bufferData(gl.ARRAY_BUFFER, data.colors, gl.DYNAMIC_COPY)
        gl.enableVertexAttribArray(this.attributeIndices['aLightColor'])
        gl.vertexAttribPointer(this.attributeIndices['aLightColor'], 3, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(this.attributeIndices['aLightColor'], 1)

        this.buffers['intensity'] = gl.createBuffer() as WebGLBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['intensity'])
        gl.bufferData(gl.ARRAY_BUFFER, data.intensities, gl.DYNAMIC_COPY)
        gl.enableVertexAttribArray(this.attributeIndices['aLightIntensity'])
        gl.vertexAttribPointer(this.attributeIndices['aLightIntensity'], 1, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(this.attributeIndices['aLightIntensity'], 1)

        this.buffers['radius'] = gl.createBuffer() as WebGLBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers['radius'])
        gl.bufferData(gl.ARRAY_BUFFER, data.radii, gl.DYNAMIC_COPY)
        gl.enableVertexAttribArray(this.attributeIndices['aLightRadius'])
        gl.vertexAttribPointer(this.attributeIndices['aLightRadius'], 1, gl.FLOAT, false, 0, 0)
        gl.vertexAttribDivisor(this.attributeIndices['aLightRadius'], 1)

        gl.bindVertexArray(null)

        bindGBuffer(gl, this.program)

        this.radius = new Float32Array([options.radius])
        this.intensity = new Float32Array([options.intensity])

        this.color = options.color
        this.count = count
    }
    Init() {
        this.position = this.parent.transform.position
        Engine.Graphics.lightManager.addLight(this)
    }
    Destroy() {
        Engine.Graphics.lightManager.removeLight(this)
    }
    render(cameraPosition: vec3) {
        const gl = this.gl

        gl.useProgram(this.program)
        gl.uniform3fv(this.uniformLocations['uCameraPosition'], cameraPosition)
        gl.uniform3fv(this.uniformLocations['uLightPosition'], this.position!)

        gl.bindVertexArray(this.vao)
        gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, 4, this.count)
        gl.bindVertexArray(null)
    }
}

