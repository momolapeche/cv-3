import { mat4, vec2, vec3, vec4 } from "gl-matrix"
import { GameObject } from "../GameObject"
import { Engine } from "../lib"
import { ALBEDO_INDEX, AO_INDEX, EMISSION_INDEX, FREE_INDEX0, GraphicObject, MATERIAL_INDEX, MeshComponent, NORMAL_INDEX, POSITION_INDEX } from "../Graphics"
import { ShadowMapPool, ShadowMap } from "./ShadowMap"
import { bindGBuffer, createProgram, createTextureAndBindToFramebuffer, framebufferStatus } from "./utils"
import { Transform } from "../Transform"
import { Component } from "../Component"

export class EmissionPass {
    private gl: WebGLRenderingContext
    private program: WebGLProgram

    constructor(gl: WebGL2RenderingContext, shaders: [WebGLShader, WebGLShader]) {
        this.gl = gl
        this.program = createProgram(gl, shaders)
        gl.useProgram(this.program)
        gl.uniform1i(gl.getUniformLocation(this.program, 'uEmission'), EMISSION_INDEX)
    }

    pass() {
        this.gl.useProgram(this.program)
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
    }
}

interface Light {
    render: (cameraPosition: vec3) => void
}

export class LightManager {
    private gl: WebGL2RenderingContext
    private lights: Light[] = []
    private emissionPass: EmissionPass = <EmissionPass><unknown>null
    readonly lightFB: WebGLFramebuffer
    readonly lightTex: WebGLTexture

    spotLightSMs: [SpotLightComponent, ShadowMap][] = []
    directionalLightSMs: [DirectionalLightComponent, ShadowMap][] = []

    shadowMapPool: ShadowMapPool

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl

        this.lightFB = gl.createFramebuffer() as WebGLFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFB)

        this.lightTex = gl.createTexture() as WebGLTexture
        gl.bindTexture(gl.TEXTURE_2D, this.lightTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.FLOAT, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.lightTex, 0)

        framebufferStatus(gl)

        this.shadowMapPool = new ShadowMapPool(gl)
    }

    async setup() {
        const GM = Engine.Graphics

        this.emissionPass = new EmissionPass(this.gl,
            [
                GM.shaders.compileShader('basicVS', {type: 'vertex'}),
                GM.shaders.compileShader('emissionFS', {type: 'fragment'}),
            ]
        )
    }

    reset() {
        this.lights = []
        for (const [_, sm] of this.directionalLightSMs) {
            this.shadowMapPool.free(sm)
        }
        this.directionalLightSMs = []
        for (const [_, sm] of this.spotLightSMs) {
            this.shadowMapPool.free(sm)
        }
        this.spotLightSMs = []
    }

    renderShadowMaps(objects: GraphicObject[]) {
        const gl = this.gl

        gl.enable(gl.CULL_FACE)
        gl.cullFace(gl.FRONT)

        const cameraTransform = mat4.create()
        const cameraProjection = mat4.create()

        gl.enable(gl.DEPTH_TEST)

        for (const [light, sm] of this.spotLightSMs) {
            const tmp = light.transform.getMatrix()
            mat4.invert(cameraTransform, tmp)
            mat4.perspective(cameraProjection, light.halfAngle * 2, 1, 0.01, light.radius)

            sm.render(objects, cameraTransform, cameraProjection)
        }

        for (const [light, sm] of this.directionalLightSMs) {
            const tmp = light.transform.getMatrix()
            mat4.invert(cameraTransform, tmp)
            mat4.ortho(cameraProjection, -5, 5, -5, 5, 0.01, 30)

            sm.render(objects, cameraTransform, cameraProjection)
        }

        gl.disable(gl.DEPTH_TEST)
        gl.cullFace(gl.BACK)
    }

    render(cameraPosition: vec3) {
        const gl = this.gl

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFB)
        gl.drawBuffers([gl.COLOR_ATTACHMENT0])

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        this.emissionPass.pass()

        for (const light of this.lights) {
            light.render(cameraPosition)
        }

        gl.disable(gl.BLEND)
    }

    addSpotLightComponent(object: GameObject, options: SpotLightOptions) {
        object.addComponent(new SpotLightComponent(object, this, options))
    }

    addDirectionalLightComponent(object: GameObject, options: DirectionalLightOptions) {
        object.addComponent(new DirectionalLightComponent(object, this, options))
    }

    addLight(light: Light) {
        this.lights.push(light)

        if (light instanceof SpotLightComponent) {
            if (light.hasShadowMap) {
                light.shadowMap = this.shadowMapPool.get()
                this.spotLightSMs.push([light, light.shadowMap])
            }
        } else if (light instanceof DirectionalLightComponent) {
            if (light.hasShadowMap) {
                light.shadowMap = this.shadowMapPool.get()
                this.directionalLightSMs.push([light, light.shadowMap])
            }
        }
    }

    removeLight(light: Light) {
        const index = this.lights.indexOf(light)
        if (index === -1) {
            throw new Error('Could not find Light')
        }
        this.lights.splice(index, 1)
        if (light instanceof SpotLightComponent) {
            if (light.shadowMap) {
                this.shadowMapPool.free(light.shadowMap)
                const index = this.spotLightSMs.findIndex(s => s[0] === light)
                if (index === -1) {
                    throw new Error('Could not find ShadowMap')
                }
            }
        }
        else if (light instanceof DirectionalLightComponent) {
            if (light.shadowMap) {
                this.shadowMapPool.free(light.shadowMap)
                const index = this.directionalLightSMs.findIndex(s => s[0] === light)
                if (index === -1) {
                    throw new Error('Could not find ShadowMap')
                }
            }
        }
    }
}

export class LightRenderer {
    private program: WebGLProgram
    uniforms: Record<string, { location: WebGLUniformLocation }>
    private gl: WebGL2RenderingContext

    constructor(shaders: [WebGLShader, WebGLShader], uniforms: string[]) {
        const gl = Engine.Graphics.context
        this.gl = gl

        this.program = createProgram(gl, shaders)

        this.uniforms = {}
        for (const uniformName of uniforms) {
            const location = gl.getUniformLocation(this.program, uniformName) as WebGLUniformLocation
            if (location === null) {
                throw new Error('Uniform not found ' + uniformName)
            }
            this.uniforms[uniformName] = {
                location,
            }
        }
    }
    useProgram() {
        this.gl.useProgram(this.program)
        return this
    }
    bindGBuffer() {
        bindGBuffer(this.gl, this.program)
        return this
    }
    uniform1i(name: string, v: number) {
        this.gl.uniform1i(this.uniforms[name].location, v)
        return this
    }
    uniform1fv(name: string, v: Float32Array) {
        this.gl.uniform1fv(this.uniforms[name].location, v)
        return this
    }
    uniform2fv(name: string, v: Float32Array | vec2) {
        this.gl.uniform2fv(this.uniforms[name].location, v)
        return this
    }
    uniform3fv(name: string, v: Float32Array | vec3) {
        this.gl.uniform3fv(this.uniforms[name].location, v)
        return this
    }
    uniform4fv(name: string, v: Float32Array | vec4) {
        this.gl.uniform4fv(this.uniforms[name].location, v)
        return this
    }
    uniformMatrix4fv(name: string, v: Float32Array | mat4) {
        this.gl.uniformMatrix4fv(this.uniforms[name].location, false, v)
        return this
    }
    bindTexture(name: string, index: number, texture: WebGLTexture) {
        this.gl.uniform1i(this.uniforms[name].location, index)
        this.gl.activeTexture(this.gl.TEXTURE0 + index)
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture)
        return this
    }
    render() {
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)
        return this
    }
}

type SpotLightOptions = {
    color: vec3
    intensity: number
    radius: number
    halfAngle: number
    shadowMap?: boolean
}

export class SpotLightComponent extends Component {
    private lightManager: LightManager
    private lightRenderer: LightRenderer
    private position: vec3 = <vec3><unknown>null
    private color: vec3
    private intensity: number
    radius: number
    halfAngle: number

    readonly hasShadowMap: boolean
    shadowMap?: ShadowMap

    transform: Transform

    constructor(gameObject: GameObject, lightManager: LightManager, options: SpotLightOptions) {
        super(gameObject)

        const defines: Record<string, unknown> = {}

        const uniforms = [
            'uCameraPosition',
            'uLightPosition',
            'uLightColor',
            'uLightIntensity',
            'uLightRadius',
            'uLightDirection',
            'uLightAngle',
        ]
        if (options.shadowMap) {
            defines['USE_SHADOW_MAP'] = ''
            uniforms.push('uShadowMap', 'uShadowMapMat')
        }

        this.lightRenderer = new LightRenderer(
            [Engine.Graphics.shaders.getShader('basicVS'), Engine.Graphics.shaders.compileShader('spotLightFS', {
                type: 'fragment',
                defines,
            })], uniforms
        ).bindGBuffer()

        this.halfAngle = options.halfAngle

        this.radius = options.radius
        this.intensity = options.intensity

        this.color = options.color

        this.hasShadowMap = options.shadowMap ?? false

        this.transform = gameObject.transform
        this.position = this.transform.position

        this.lightManager = lightManager
    }

    Init() {
        this.lightManager.addLight(this)
    }

    Destroy() {
        this.lightManager.removeLight(this)
    }

    render(cameraPosition: vec3) {
        this.lightRenderer.useProgram()
            .uniform3fv('uCameraPosition', cameraPosition)
            .uniform3fv('uLightPosition', this.position)
            .uniform3fv('uLightColor', this.color)
            .uniform1fv('uLightIntensity', new Float32Array([this.intensity]))
            .uniform1fv('uLightRadius', new Float32Array([this.radius]))
            .uniform1fv('uLightAngle', new Float32Array([this.halfAngle]))
            .uniform3fv('uLightDirection', this.parent.transform.getForward())
        if (this.shadowMap) {
            const projection = mat4.perspective(mat4.create(), this.halfAngle * 2, 1, 0.01, this.radius)
            const transform = mat4.invert(mat4.create(), this.transform.getMatrix())
            mat4.mul(transform, projection, transform)
            this.lightRenderer.uniformMatrix4fv('uShadowMapMat', transform)
            this.lightRenderer.bindTexture('uShadowMap', FREE_INDEX0, this.shadowMap.texture)
        }
        this.lightRenderer.render()
    }
}

type DirectionalLightOptions = {
    color: vec3
    intensity: number
    shadowMap?: boolean
}

export class DirectionalLightComponent extends Component {
    private lightManager: LightManager
    private lightRenderer: LightRenderer
    private color: vec3
    private intensity: number

    transform: Transform

    hasShadowMap: boolean
    shadowMap?: ShadowMap

    constructor(parent: GameObject, lightManager: LightManager, options: DirectionalLightOptions) {
        super(parent)

        const defines: Record<string, unknown> = {}

        const uniforms = [
            'uCameraPosition',
            'uLightDirection',
            'uLightColor',
            'uLightIntensity',
        ]

        if (options.shadowMap) {
            defines['USE_SHADOW_MAP'] = ''
            uniforms.push('uShadowMapMat', 'uShadowMap')
        }

        const shaders: [WebGLShader, WebGLShader] = [
            Engine.Graphics.shaders.getShader('basicVS'),
            Engine.Graphics.shaders.compileShader('directionalLightFS', {type: 'fragment', defines})
        ]


        this.lightRenderer = new LightRenderer(shaders, uniforms).bindGBuffer()

        this.intensity = options.intensity
        this.color = options.color

        this.lightManager = lightManager
        this.hasShadowMap = options.shadowMap ?? false

        this.transform = parent.transform
    }

    Init() {
        this.lightManager.addLight(this)
    }

    Destroy() {
        this.lightManager.removeLight(this)
    }

    render(cameraPosition: vec3) {
        this.lightRenderer.useProgram()
            .uniform3fv('uCameraPosition', cameraPosition)
            .uniform3fv('uLightDirection', this.parent.transform.getForward())
            .uniform3fv('uLightColor', this.color)
            .uniform1fv('uLightIntensity', new Float32Array([this.intensity]))
        if (this.shadowMap) {
            const projection = mat4.ortho(mat4.create(), -5, 5, -5, 5, 0.01, 30)
            const transform = mat4.invert(mat4.create(), this.transform.getMatrix())
            mat4.mul(transform, projection, transform)
            this.lightRenderer.uniformMatrix4fv('uShadowMapMat', transform)
            this.lightRenderer.bindTexture('uShadowMap', FREE_INDEX0, this.shadowMap.texture)
        }
        this.lightRenderer.render()
    }
}

export class AmbientLightComponent extends Component {
    private lightRenderer: LightRenderer
    #color: vec3
    #intensity: number

    constructor(parent: GameObject, color: vec3, intensity: number) {
        super(parent)

        this.lightRenderer = new LightRenderer([Engine.Graphics.shaders.getShader('basicVS'), Engine.Graphics.shaders.getShader('ambientFS')], [
            'uAO', 'uColor', 'uIntensity',
        ]).bindGBuffer()

        this.#intensity = intensity
        this.#color = color

        this.lightRenderer.useProgram()
            .uniform1i('uAO', AO_INDEX)
    }
    Init() {
        Engine.Graphics.lightManager.addLight(this)
    }
    Destroy() {
        Engine.Graphics.lightManager.removeLight(this)
    }
    render() {
        this.lightRenderer.useProgram()
            .uniform3fv('uColor', this.#color)
            .uniform1fv('uIntensity', new Float32Array([this.#intensity]))
            .render()
    }
}
