import { mat4 } from "gl-matrix"
import { Engine } from "../lib"
import { Material } from "./Material"
import { Geometry } from "./Geometry"
import { RenderableObject, RenderableObjectAttribute } from "./RenderableObject"

export class Mesh {
    private geometry: Geometry
    private material: Material

    renderableObject: RenderableObject

    constructor(geometry: Geometry, material: Material) {
        const gl = Engine.Graphics.context

        this.geometry = geometry
        this.material = material


        const defines = { ...material.defines }

        const vertexShader = Engine.Graphics.shaders.compileShaderFromStr(material.vertexShader, {type: 'vertex', defines})
        const fragmentShader = Engine.Graphics.shaders.compileShaderFromStr(material.fragmentShader, {type: 'fragment', defines})

        const attributes = Object.values(this.geometry.attributes).map((data) => {
            return {
                name: data.name,
                buffer: data.buffer,
                size: data.size,
                type: data.type,
            }
        })
        const indices = {
            buffer: this.geometry.indices.buffer,
            type: this.geometry.indices.type,
            offset: 0,
        }
        const uniforms = Object.entries(this.material.uniforms).map(([name, uniform]) => {
            return {
                name,
                type: uniform.type,
                value: uniform.value,
            }
        })

        this.renderableObject = new RenderableObject(gl, {
            indices,
            attributes,
            uniforms,
            vertexShader,
            fragmentShader,
            mode: gl.TRIANGLES,
            count: this.geometry.indices.count,
        })
    }

    render(transform: mat4, cameraTransform: mat4, cameraProjection: mat4) {
        this.renderableObject.render([
            { name: 'uCamera', data: cameraTransform },
            { name: 'uProjection', data: cameraProjection },
            { name: 'uTransform', data: transform },
        ])
    }
}

export class InstancedMesh {
    localTransformsBuffer: WebGLBuffer

    private geometry: Geometry
    private material: Material

    renderableObject: RenderableObject

    constructor(geometry: Geometry, material: Material, localTransforms: mat4[] | WebGLBuffer | null, count: number) {
        const gl = Engine.Graphics.context

        this.geometry = geometry
        this.material = material


        const defines = {
            ...material.defines,
            INSTANCED: '',
        }

        const vertexShader = Engine.Graphics.shaders.compileShaderFromStr(material.vertexShader, {type: 'vertex', defines})
        const fragmentShader = Engine.Graphics.shaders.compileShaderFromStr(material.fragmentShader, {type: 'fragment', defines})

        if (localTransforms instanceof WebGLBuffer) {
            this.localTransformsBuffer = localTransforms
        }
        else {
            this.localTransformsBuffer = gl.createBuffer() as WebGLBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.localTransformsBuffer)
            if (localTransforms === null) {
                gl.bufferData(gl.ARRAY_BUFFER, count*16*4, gl.DYNAMIC_COPY)
            }
            else {
                const data = new Float32Array(localTransforms.reduce((acc: number[], m: mat4) => [...acc, ...m], []))
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_COPY)
            }
        }

        const attributes: RenderableObjectAttribute[] = Object.values(this.geometry.attributes).map((data) => {
            return {
                name: data.name,
                buffer: data.buffer,
                size: data.size,
                type: data.type,
            }
        })

        attributes.push({
            name: 'aLocalTransform',
            buffer: this.localTransformsBuffer,
            size: 4,
            type: gl.FLOAT,
            stride: 64,
            offset: 0,
            divisor: 1,
            locationOffset: 0,
        })
        attributes.push({
            name: 'aLocalTransform',
            buffer: this.localTransformsBuffer,
            size: 4,
            type: gl.FLOAT,
            stride: 64,
            offset: 16,
            divisor: 1,
            locationOffset: 1,
        })
        attributes.push({
            name: 'aLocalTransform',
            buffer: this.localTransformsBuffer,
            size: 4,
            type: gl.FLOAT,
            stride: 64,
            offset: 32,
            divisor: 1,
            locationOffset: 2,
        })
        attributes.push({
            name: 'aLocalTransform',
            buffer: this.localTransformsBuffer,
            size: 4,
            type: gl.FLOAT,
            stride: 64,
            offset: 48,
            divisor: 1,
            locationOffset: 3,
        })

        const indices = {
            buffer: this.geometry.indices.buffer,
            type: this.geometry.indices.type,
            offset: 0,
        }
        const uniforms = Object.entries(this.material.uniforms).map(([name, uniform]) => {
            return {
                name,
                type: uniform.type,
                value: uniform.value,
            }
        })

        this.renderableObject = new RenderableObject(gl, {
            indices,
            attributes,
            uniforms,
            vertexShader,
            fragmentShader,
            mode: gl.TRIANGLES,
            count: this.geometry.indices.count,
            instanced: {
                count: count,
            }
        })
    }
    render(transform: mat4, cameraTransform: mat4, cameraProjection: mat4) {
        this.renderableObject.render([
            { name: 'uCamera', data: cameraTransform },
            { name: 'uProjection', data: cameraProjection },
            { name: 'uTransform', data: transform },
        ])
    }
}
