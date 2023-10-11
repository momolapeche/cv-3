import { mat4, vec3 } from 'gl-matrix';
import { Events } from './EventList';
import { GameObject } from './GameObject';
import { Manager } from './Manager';
import { Engine } from './lib';
import { InstancedMesh, Mesh } from './graphics/Mesh';
import { LightManager } from './graphics/Light';
import { GLTFLoader, GLTFMesh, GLTFRawAnimation } from './graphics/GLTFLoader';
import { SSAOPass } from './graphics/AOPass';
import { createTextureAndBindToFramebuffer, fetchShaderSrc, framebufferStatus } from './graphics/utils';
import { Shaders } from './graphics/Shaders';
import { RenderableObject } from './graphics/RenderableObject';
import { CameraComponent } from './graphics/Camera';
import { Transform } from './Transform';
import { Component } from './Component';
import { BloomPass } from './graphics/BloomPass';

export const POSITION_INDEX = 0
export const ALBEDO_INDEX = 1
export const NORMAL_INDEX = 2
export const EMISSION_INDEX = 3
export const MATERIAL_INDEX = 4

export const AO_INDEX = 5

export const FREE_INDEX0 = 12

export const DEPTH_INDEX = 7

export const LIGHTING_INDEX = 10

export class MeshComponent extends Component {
    private transform: Transform
    private mesh: Mesh | InstancedMesh | GLTFMesh | RenderableObject

    constructor(parent: GameObject, mesh: Mesh | GLTFMesh | InstancedMesh | RenderableObject) {
        super(parent)

        this.transform = this.parent.transform

        this.mesh = mesh
    }

    Init() {
        Engine.Graphics.addObject(this)
    }

    Destroy() {
        Engine.Graphics.removeObject(this)
    }

    render(cameraTransform: mat4, cameraProjection: mat4) {
        const tranform = this.transform.getMatrix()
        if (this.mesh instanceof RenderableObject) {
            this.mesh.render([
                { name: 'uTransform', data: tranform },
                { name: 'uCamera', data: cameraTransform },
                { name: 'uProjection', data: cameraProjection },
            ])
        }
        else {
            this.mesh.render(tranform, cameraTransform, cameraProjection)
        }
    }
}

export interface GraphicObject {
    render: (cameraTransform: mat4, cameraProjection: mat4) => void
}

export class GraphicsManager extends Manager {
    readonly context: WebGL2RenderingContext

    private shaderSrcsLoaded = false

    private objects: GraphicObject[] = []

    readonly shaders: Shaders

    private frameBuffer: WebGLFramebuffer
    private depthTex: WebGLTexture
    private positionTex: WebGLTexture
    private albedoTex: WebGLTexture
    private normalTex: WebGLTexture
    private emissionTex: WebGLTexture
    private materialTex: WebGLTexture

    readonly lightManager: LightManager

    private outputProgram: WebGLProgram = <WebGLProgram><unknown>null

    private ssaoPass: SSAOPass = <SSAOPass><unknown>null

    private bloomPass: BloomPass

    private GLTFModels: Record<string, GLTFMesh> = {}
    private GLTFRawAnimations: Record<string, GLTFRawAnimation[]> = {}

    camera: CameraComponent | null = null

    constructor() {
        super()

        const canvas = document.querySelector('canvas') as HTMLCanvasElement
        canvas.width = 768
        canvas.height = 576

        const gl = canvas.getContext('webgl2') as WebGL2RenderingContext
        this.context = gl

        gl.getExtension("EXT_color_buffer_float")
        gl.getExtension("EXT_float_blend")
        gl.getExtension("OES_texture_float_linear")

        gl.enable(gl.CULL_FACE)

        gl.clearColor(0, 0, 0, 1)

        this.frameBuffer = gl.createFramebuffer() as WebGLFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer)

        this.positionTex = createTextureAndBindToFramebuffer(gl, POSITION_INDEX)
        this.albedoTex = createTextureAndBindToFramebuffer(gl, ALBEDO_INDEX)
        this.normalTex = createTextureAndBindToFramebuffer(gl, NORMAL_INDEX)
        this.materialTex = createTextureAndBindToFramebuffer(gl, MATERIAL_INDEX)
        this.emissionTex = createTextureAndBindToFramebuffer(gl, EMISSION_INDEX)

        this.depthTex = gl.createTexture() as WebGLTexture
        gl.bindTexture(gl.TEXTURE_2D, this.depthTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, gl.canvas.width, gl.canvas.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTex, 0)

        framebufferStatus(gl)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        this.shaders = new Shaders(gl)

        this.lightManager = new LightManager(gl)

        this.bloomPass = new BloomPass(gl, gl.canvas.width, gl.canvas.height)
    }

    async loadShaderSrcs() {
        const shaderFilenames = [
            'vertexShader',
            'fragmentShader',
            'lightFS',
            'basicVS',
            'pointLightVS',
            'pointLightFS',
            'emissionFS',
            'outputFS',
            'aoFS',
            'directionalLightFS',
            'spotLightFS',
            'ambientFS',
        ]
        for (const n of shaderFilenames) {
            this.shaders.loadAsync(n, n)
        }
        await this.shaders.waitForAll()

        this.shaders.compileShader('basicVS', {type: 'vertex', store: {id: 'basicVS'}})
        this.shaders.compileShader('pointLightVS', {type: 'vertex', store: {id: 'pointLightVS'}})
        this.shaders.compileShader('pointLightFS', {type: 'fragment', store: {id: 'pointLightFS'}})
        this.shaders.compileShader('directionalLightFS', {type: 'fragment', store: {id: 'directionalLightFS'}})
        this.shaders.compileShader('spotLightFS', {type: 'fragment', store: {id: 'spotLightFS'}})
        this.shaders.compileShader('ambientFS', {type: 'fragment', store: {id: 'ambientFS'}})

        this.shaderSrcsLoaded = true
    }

    async Setup() {
        this.lightManager.reset()
        
        if (this.shaderSrcsLoaded === false) {
            await this.loadShaderSrcs()

            await this.lightManager.setup()

            this.ssaoPass = new SSAOPass(this.context)

            const gl = this.context
            this.outputProgram = gl.createProgram() as WebGLProgram
            gl.attachShader(this.outputProgram, this.shaders.compileShader('basicVS', {type: 'vertex'}))
            gl.attachShader(this.outputProgram, this.shaders.compileShader('outputFS', {type: 'fragment'}))
            gl.linkProgram(this.outputProgram)
            if (!gl.getProgramParameter(this.outputProgram, gl.LINK_STATUS)) {
                throw new Error('Could not link program: ' + gl.getProgramInfoLog(this.outputProgram))
            }
            gl.useProgram(this.outputProgram)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uPosition'), POSITION_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uAlbedo'), ALBEDO_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uNormal'), NORMAL_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uMaterial'), MATERIAL_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uEmission'), EMISSION_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uAO'), AO_INDEX)
            gl.uniform1i(gl.getUniformLocation(this.outputProgram, 'uColor'), LIGHTING_INDEX)
        }
    }

    addObject(obj: GraphicObject) {
        this.objects.push(obj)
    }

    removeObject(obj: GraphicObject) {
        const index = this.objects.indexOf(obj)
        if (index === -1) {
            throw new Error('Object not found in Graphics.objects')
        }
        this.objects.splice(index, 1)
    }


    async loadGLTF(id: string, filename: string) {
        const loader = new GLTFLoader()
        const ret = await loader.load(this.context, filename)
        if (ret.mesh !== undefined) {
            this.GLTFModels[id] = ret.mesh
        }
        if (ret.rawAnimations !== undefined) {
            this.GLTFRawAnimations[id] = ret.rawAnimations
        }
    }
    getGLTFModel(id: string): GLTFMesh | undefined {
        return this.GLTFModels[id]
    }
    getGLTFAnimations(id: string): GLTFRawAnimation[] | undefined {
        return this.GLTFRawAnimations[id]
    }

    Render(data: Events['Render']) {
        const gl = this.context

        if (this.camera === null) {
            return
        }

        this.lightManager.renderShadowMaps(this.objects)

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        const projection = this.camera.projection
        const cameraPosition = this.camera.transform.position
        const cameraTransform = this.camera.getVueMatrix()
        const viewProjectionMatrix = mat4.mul(mat4.create(), projection, cameraTransform)

        this.objectsPass(cameraTransform, projection)

        this.bindGBuffer()
        
        this.ssaoPass.pass(viewProjectionMatrix, cameraTransform)
        gl.activeTexture(gl.TEXTURE0 + AO_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.ssaoPass.output)

        this.lightManager.render(cameraPosition)

        this.bloomPass.pass(this.lightManager.lightTex, this.lightManager.lightTex)

        gl.activeTexture(gl.TEXTURE0 + LIGHTING_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.lightManager.lightTex)

        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.clearColor(0, 0, 0, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(this.outputProgram)

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    objectsPass(cameraTransform: mat4, cameraProjection: mat4) {
        const gl = this.context

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer)

        gl.enable(gl.DEPTH_TEST)
        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0 + 0,
            gl.COLOR_ATTACHMENT0 + 1,
            gl.COLOR_ATTACHMENT0 + 2,
            gl.COLOR_ATTACHMENT0 + 3,
            gl.COLOR_ATTACHMENT0 + 4,
        ])

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        for (const object of this.objects) {
            object.render(cameraTransform, cameraProjection)
        }

        gl.disable(gl.DEPTH_TEST)
    }

    bindGBuffer() {
        const gl = this.context
        gl.activeTexture(gl.TEXTURE0 + DEPTH_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.depthTex)

        gl.activeTexture(gl.TEXTURE0 + POSITION_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.positionTex)
        
        gl.activeTexture(gl.TEXTURE0 + ALBEDO_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.albedoTex)

        gl.activeTexture(gl.TEXTURE0 + NORMAL_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.normalTex)

        gl.activeTexture(gl.TEXTURE0 + MATERIAL_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.materialTex)

        gl.activeTexture(gl.TEXTURE0 + EMISSION_INDEX)
        gl.bindTexture(gl.TEXTURE_2D, this.emissionTex)
    }
}









