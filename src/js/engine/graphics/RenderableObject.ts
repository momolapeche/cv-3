function drawElements(gl: WebGL2RenderingContext, buffer: WebGLBuffer, mode: number, type: number, count: number, offset: number): void {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
    gl.drawElements(mode, count, type, offset)
}

function drawElementsInstanced(gl: WebGL2RenderingContext, buffer: WebGLBuffer, mode: number, type: number, count: number, offset: number, instanceCount: number): void {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer)
    gl.drawElementsInstanced(mode, count, type, offset, instanceCount)
}

export type RenderableObjectAttribute = {
    name: string,
    buffer: WebGLBuffer
    type: number
    size: number
    locationOffset?: number
    offset?: number
    stride?: number
    divisor?: number
}
export type RenderableObjectOptions = {
    indices?: {
        buffer: WebGLBuffer
        type: number
        offset?: number
    }
    attributes: RenderableObjectAttribute[]
    uniforms: {
        name: string
        type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat2' | 'mat3' | 'mat4'
        value?: unknown
    }[]
    vertexShader: WebGLShader
    fragmentShader: WebGLShader
    mode: number
    count: number
    instanced?: {
        count: number
    }
}

export class RenderableObject {
    private gl: WebGL2RenderingContext
    private program: WebGLProgram
    private vao: WebGLVertexArrayObject
    private uniforms: Record<string, (data: any) => void> = {}
    private renderFunc: () => void

    constructor(gl: WebGL2RenderingContext, options: RenderableObjectOptions) {
        this.gl = gl

        this.program = gl.createProgram() as WebGLProgram
        gl.attachShader(this.program, options.vertexShader)
        gl.attachShader(this.program, options.fragmentShader)
        gl.linkProgram(this.program)
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('Could not link program: ' + gl.getProgramInfoLog(this.program))
        }

        this.vao = gl.createVertexArray() as WebGLVertexArrayObject
        gl.bindVertexArray(this.vao)
        for (const attribute of options.attributes) {
            const location = gl.getAttribLocation(this.program, attribute.name) + (attribute.locationOffset ?? 0)
            gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer)
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, attribute.size, attribute.type, false, attribute.stride ?? 0, attribute.offset ?? 0)
            if (attribute.divisor) {
                gl.vertexAttribDivisor(location, attribute.divisor)
            }
        }
        gl.bindVertexArray(null)

        gl.useProgram(this.program)
        for (const uniform of options.uniforms) {
            const location = gl.getUniformLocation(this.program, uniform.name)
            switch (uniform.type) {
                case 'float':
                    this.uniforms[uniform.name] = gl.uniform1f.bind(gl, location)
                    break
                case 'vec2':
                    this.uniforms[uniform.name] = gl.uniform2fv.bind(gl, location)
                    break
                case 'vec3':
                    this.uniforms[uniform.name] = gl.uniform3fv.bind(gl, location)
                    break
                case 'vec4':
                    this.uniforms[uniform.name] = gl.uniform4fv.bind(gl, location)
                    break
                case 'mat2':
                    this.uniforms[uniform.name] = gl.uniformMatrix2fv.bind(gl, location, false)
                    break
                case 'mat3':
                    this.uniforms[uniform.name] = gl.uniformMatrix3fv.bind(gl, location, false)
                    break
                case 'mat4':
                    this.uniforms[uniform.name] = gl.uniformMatrix4fv.bind(gl, location, false)
                    break
                default:
                    throw new Error('Not implemented')
            }
            if (uniform.value !== undefined) {
                this.uniforms[uniform.name](uniform.value)
            }
        }

        if (options.indices) {
            if (options.instanced) {
                this.renderFunc = drawElementsInstanced.bind<null, any, void>(
                    null,
                    gl,
                    options.indices.buffer,
                    options.mode,
                    options.indices.type,
                    options.count,
                    options.indices.offset ?? 0,
                    options.instanced.count
                )
            }
            else {
                this.renderFunc = drawElements.bind<null, any, void>(
                    null,
                    gl,
                    options.indices.buffer,
                    options.mode,
                    options.indices.type,
                    options.count,
                    options.indices.offset ?? 0
                )
            }
        }
        else {
            if (options.instanced) {
                this.renderFunc = gl.drawArraysInstanced.bind(gl, options.mode, 0, options.count, options.instanced.count)
            }
            else {
                this.renderFunc = gl.drawArrays.bind(gl, options.mode, 0, options.count)
            }
        }
    }
    render(uniforms: {name: string, data: any}[]) {
        const gl = this.gl

        gl.useProgram(this.program)

        for (const uniform of uniforms) {
            this.uniforms[uniform.name](uniform.data)
        }

        gl.bindVertexArray(this.vao)
        this.renderFunc()
        gl.bindVertexArray(null)
    }
}
