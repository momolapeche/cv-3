import { Engine } from "../lib"
import { TransformFeedback } from "./TransformFeedback"
import { compileShader } from "./utils"

const vShaderSrc = `#version 300 es

uniform float uTime;

out vec3 vPosition;
out vec3 vScale;

out vec3 vLightPosition;
out float vLightIntensity;

#define PI 3.14159265359

#define N 4

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    float x = float(gl_VertexID % N) - float(N / 2);
    float y = float(gl_VertexID / N) - float(N / 2);

    float phase = rand(vec2(x, y));

    vec3 o = vec3((x / float(N / 2)), 0, (y / float(N / 2))) * 2.;

    float t = fract(phase + (uTime + 1000.) *.9 / (1. + phase * 2.));

    vec3 p = vec3(o.x, t, o.z);
    vec3 s = vec3(t < 0.3 ? smoothstep(0., 0.3, t) : smoothstep(1., 0.7, t)) * (phase * 2. + 1.)*.5;

    vPosition = p;
    vScale = s;
    vLightPosition = p;
    vLightIntensity = 4. * PI * (s.x * s.x) * 0.1;
}
`

const vOutputSrc = `#version 300 es

in vec3 aPosition;
in vec3 aScale;

out mat4 vTransform;

void main() {
    vec3 s = aScale;
    vec3 p = aPosition;
    vTransform = mat4(
        s.x, 0.0, 0.0, 0.0,
        0.0, s.y, 0.0, 0.0,
        0.0, 0.0, s.z, 0.0,
        p.x, p.y, p.z, 1.0
    );
}
`

export class Particles {
    private gl: WebGL2RenderingContext

    tf: TransformFeedback
    otf: TransformFeedback

    private positionBuffer: WebGLBuffer
    private scaleBuffer: WebGLBuffer

    constructor(gl: WebGL2RenderingContext, output: WebGLBuffer, outPosition: WebGLBuffer, outIntensity: WebGLBuffer, count: number) {
        this.gl = gl
        {
            this.positionBuffer = gl.createBuffer() as WebGLBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, count * 12, gl.DYNAMIC_COPY)
        }
        {
            this.scaleBuffer = gl.createBuffer() as WebGLBuffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer)
            gl.bufferData(gl.ARRAY_BUFFER, count * 12, gl.DYNAMIC_COPY)
        }
        this.tf = new TransformFeedback(gl, {
            shader: compileShader(gl, vShaderSrc, 'vertex'),
            mode: gl.SEPARATE_ATTRIBS,
            varyings: ['vPosition', 'vScale', 'vLightPosition', 'vLightIntensity'],
            feedbackBuffers: [this.positionBuffer, this.scaleBuffer, outPosition, outIntensity],
            uniforms: [{ name: 'uTime', type: 'float' }],
            attributes: [],
            count,
        })

        this.otf = new TransformFeedback(gl, {
            shader: compileShader(gl, vOutputSrc, 'vertex'),
            mode: gl.INTERLEAVED_ATTRIBS,
            varyings: ['vTransform'],
            feedbackBuffers: [output],
            uniforms: [],
            attributes: [
                { name: 'aPosition', buffer: this.positionBuffer, size: 3, type: gl.FLOAT },
                { name: 'aScale', buffer: this.scaleBuffer, size: 3, type: gl.FLOAT },
            ],
            count,
        })
    }

    render() {
        const gl = this.gl

        gl.bindBuffer(gl.ARRAY_BUFFER, null)
        gl.bindVertexArray(null)

        this.tf.render([{ name: 'uTime', data: Engine.Time.time }])
        this.otf.render([])
    }
}
