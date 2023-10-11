import { compileShader } from "./utils"

const fShaderSrc = `#version 300 es

void main() {
}
`

type TransformFeedbackOptions = {
    shader: WebGLShader
    varyings: string[]
    feedbackBuffers: WebGLBuffer[]
    uniforms: { name: string, type: 'float' }[]
    mode: WebGL2RenderingContext['SEPARATE_ATTRIBS'] | WebGL2RenderingContext['INTERLEAVED_ATTRIBS']
    attributes: { name: string, buffer: WebGLBuffer, size: number, type: number, stride?: number, offset?: number }[]
    count: number
}

export class TransformFeedback {
    private gl: WebGL2RenderingContext

    private program: WebGLProgram

    private uniforms: Record<string, (data: any) => void> = {}

    private count: number

    private vao: WebGLVertexArrayObject

    tranformFeedback: WebGLTransformFeedback

    constructor(gl: WebGL2RenderingContext, options: TransformFeedbackOptions) {
        this.gl = gl
        this.count = options.count

        const vShader = options.shader
        const fShader = compileShader(gl, fShaderSrc, 'fragment')

        {
            const program = gl.createProgram() as WebGLProgram
            gl.attachShader(program, vShader)
            gl.attachShader(program, fShader)
            gl.transformFeedbackVaryings(program, options.varyings, options.mode)
            gl.linkProgram(program)
            this.program = program
        }

        for (const uniform of options.uniforms) {
            const location = gl.getUniformLocation(this.program, uniform.name) as WebGLUniformLocation
            switch (uniform.type) {
                case 'float':
                    this.uniforms[uniform.name] = gl.uniform1f.bind(gl, location)
                    break
            }
        }

        this.vao = gl.createVertexArray() as WebGLVertexArrayObject
        gl.bindVertexArray(this.vao)
        for (const attribute of options.attributes) {
            const location = gl.getAttribLocation(this.program, attribute.name)
            gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer)
            gl.enableVertexAttribArray(location)
            gl.vertexAttribPointer(location, attribute.size, attribute.type, false, attribute.stride ?? 0, attribute.offset ?? 0)
        }
        gl.bindVertexArray(null)

        this.tranformFeedback = gl.createTransformFeedback() as WebGLTransformFeedback
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tranformFeedback)
        options.feedbackBuffers.forEach((buffer, i) => {
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, buffer)
        })
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
    }

    render(uniforms: { name: string, data: any }[]) {
        const gl = this.gl

        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        gl.bindVertexArray(null)

        gl.enable(gl.RASTERIZER_DISCARD)

        gl.useProgram(this.program)
        
        for (const uniform of uniforms) {
            this.uniforms[uniform.name](uniform.data)
        }

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tranformFeedback)

        gl.bindVertexArray(this.vao)
        gl.beginTransformFeedback(gl.POINTS)
        gl.drawArrays(gl.POINTS, 0, this.count)
        gl.endTransformFeedback()
        gl.bindVertexArray(null)


        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null)
        gl.disable(gl.RASTERIZER_DISCARD)
    }
}
