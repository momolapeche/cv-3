import { mat4 } from "gl-matrix";
import { Engine } from "../lib";
import { Transform } from "../Transform";
import { PointLightComponent } from "./Light/PointLight";
import { RenderableObject } from "./RenderableObject";

const vShaderSrc = `
precision highp float;

uniform mat4 uTransform;
uniform mat4 uCamera;
uniform mat4 uProjection;
uniform vec3 uScale;

#ifdef INSTANCED
    in mat4 aLocalTransform;
#endif

in vec3 aPosition;

out vec3 vPosition;

void main() {
    vec4 p = vec4(aPosition * uScale, 1);
#ifdef INSTANCED
    vPosition = (uTransform * aLocalTransform * p).xyz;
    gl_Position = uProjection * uCamera * uTransform * aLocalTransform * p;
#else
    vPosition = (uTransform * p).xyz;
    gl_Position = uProjection * uCamera * uTransform * p;
#endif
}


`

const fShaderSrc = `
precision highp float;

in vec3 vPosition;

layout(location = 0) out vec4 oPosition;
layout(location = 1) out vec4 oAlbedo;
layout(location = 2) out vec3 oNormal;
layout(location = 3) out vec3 oEmission;
layout(location = 4) out vec4 oMaterial;

void main() {
    oPosition = vec4(vPosition, 1);
    oAlbedo = vec4(vec3(0), 1);
    oNormal = vec3(0, 0, 1);
    oMaterial = vec4(0);
    oEmission = vec3(2);
}
`

function createSpherePositions(n: number) {
    const points = []
    for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2
        const a1 = ((i + 1) % n) / n * Math.PI * 2

        points.push(Math.cos(a0), Math.sin(a0), 0)
        points.push(Math.cos(a1), Math.sin(a1), 0)
        points.push(0, Math.cos(a0), Math.sin(a0))
        points.push(0, Math.cos(a1), Math.sin(a1))
        points.push(Math.sin(a0), 0, Math.cos(a0))
        points.push(Math.sin(a1), 0, Math.cos(a1))
    }
    points.push(-1, 0, 0, 1, 0, 0)
    points.push(0, -1, 0, 0, 1, 0)
    points.push(0, 0, -1, 0, 0, 1)

    return { count: n*6+6, data: new Float32Array(points) }
}

function createSphereRO(gl: WebGL2RenderingContext, defines: Record<string, any>) {
    const n = 32

    const vertexShader = Engine.Graphics.shaders.compileShaderFromStr(vShaderSrc, { type: 'vertex', defines })
    const fragmentShader = Engine.Graphics.shaders.compileShaderFromStr(fShaderSrc, { type: 'fragment', defines })

    const {data, count} = createSpherePositions(n)
    const positionBuffer = gl.createBuffer() as WebGLBuffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

    return new RenderableObject(gl, {
        vertexShader,
        fragmentShader,

        attributes: [
            { name: 'aPosition', buffer: positionBuffer, type: gl.FLOAT, size: 3 },
        ],

        uniforms: [
            { name: 'uScale', type: 'vec3' },
            { name: 'uTransform', type: 'mat4' },
            { name: 'uCamera', type: 'mat4' },
            { name: 'uProjection', type: 'mat4' },
        ],

        mode: gl.LINES,
        count,
    })
}

export class Helper {
    private transform: Transform
    private target: PointLightComponent

    readonly ro: RenderableObject

    private scale: Float32Array

    constructor(gl: WebGL2RenderingContext, transform: Transform, target: PointLightComponent) {
        this.transform = transform
        this.target = target

        const defines = {}

        this.ro = createSphereRO(gl, defines)

        this.scale = new Float32Array([0,0,0])
    }
    render(cameraTransform: mat4, cameraProjection: mat4) {
        const r = this.target.getRadius()
        this.scale[0] = r
        this.scale[1] = r
        this.scale[2] = r
        this.ro.render([
            { name: 'uTransform', data: this.transform.getMatrix() },
            { name: 'uCamera', data: cameraTransform },
            { name: 'uProjection', data: cameraProjection },
            { name: 'uScale', data: this.scale },
        ])
    }
}



