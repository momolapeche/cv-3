import { mat4, quat, vec3 } from 'gl-matrix';
import { fragmentShader, vertexShader } from './GLTFLoaderShaders';
import * as GLTF from './GLTFLoaderTypes'
import { GameObject } from '../GameObject';
import { Component } from '../Component';

function assert(v: boolean, msg?: string): asserts v {
    if (v === false) {
        throw new Error(msg ?? 'not implemented')
    }
}

const ACCESSOR_SIZE = {
    SCALAR: 1,
    VEC2: 2,
    VEC3: 3,
    VEC4: 4,
    MAT2: 4,
    MAT3: 9,
    MAT4: 16,
}

const ATTRIBUTES_MAP: Record<string, string> = {
    POSITION: 'aPosition',
    NORMAL: 'aNormal',
    JOINTS_0: 'aJoints',
    WEIGHTS_0: 'aWeights',
    TEXCOORD_0: 'aTexCoords',
}


function loadShader(gl: WebGL2RenderingContext, src: string, type: "fragment" | "vertex") {
    const shader = gl.createShader(type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)
    if (shader === null) {
        throw new Error(('Could not create shader'));
    }
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Could not compile shader: ' + gl.getShaderInfoLog(shader));
    }
    return shader
}

type ParsedBufferView = {
    buffer: WebGLBuffer,
    target: number,
    stride: number,
}

type JointNode = {
    name: string,
    defaultRotation: quat,
    defaultTranslation: vec3,
    defaultScale: vec3,
    localForwardMatrix: mat4,
    globalForwardMatrix: mat4,
    matrix: mat4,
    parent: JointNode | null,
}

type GLTFSkin = {
    jointStart: number,
    jointCount: number,
    uboBuffer: WebGLBuffer,
    buffer: Float32Array,
}

type SkinsInfo = {
    skins: GLTFSkin[],

    inverseBindMatrices: mat4[],
    localForwardMatrices: mat4[],
    globalForwardMatrices: mat4[],
    jointMatrices: mat4[],
    jointParents: number[],

    jointNodes: JointNode[],
}

type Primitive = {
    program: WebGLProgram,
    vao: WebGLVertexArrayObject,
    indices: ParsedBufferView,
    indicesType: number,
    count: number,
    mode: number,
    skinUBOIndex?: number,
}

type Mesh = {
    primitives: Primitive[],
    skin?: GLTFSkin,
}

type Animation = {
    inputs: Float32Array,
    channels: { target: number, size: 3 | 4, output: Float32Array }[],
    duration: number,
}

export type GLTFRawAnimation = {
    inputs: Float32Array,
    channels: { target: { name: string, path: "rotation" | "translation" | "scale" }, output: Float32Array }[],
    duration: number,
}

class GLTFSkins {
    gl: WebGL2RenderingContext
    skins: GLTFSkin[]
    jointNodes: JointNode[]

    jointMatrices: mat4[]

    jointParents: number[]
    inverseBindMatrices: mat4[]
    localForwardMatrices: mat4[]
    globalForwardMatrices: mat4[]

    constructor(gl: WebGL2RenderingContext, skinsInfo: SkinsInfo) {
        this.gl = gl
        this.skins = skinsInfo.skins

        this.jointNodes = skinsInfo.jointNodes
        this.jointMatrices = skinsInfo.jointMatrices
        this.jointParents = skinsInfo.jointParents
        this.inverseBindMatrices = skinsInfo.inverseBindMatrices
        this.localForwardMatrices = skinsInfo.localForwardMatrices
        this.globalForwardMatrices = skinsInfo.globalForwardMatrices
    }

    resetJointForwardMatrices() {
        const jointNodes = this.jointNodes

        for (const jointNode of jointNodes) {
            mat4.fromRotationTranslationScale(
                jointNode.localForwardMatrix,
                jointNode.defaultRotation,
                jointNode.defaultTranslation,
                jointNode.defaultScale
            )
        }
    }

    updateJointForwardMatrices(animationArray: Float32Array) {
        const jointNodes = this.jointNodes

        for (let i = 0; i < jointNodes.length; i++) {
            const arrayIndex = i * (3 + 3 + 4)
            const r = animationArray.subarray(arrayIndex    , arrayIndex + 4)
            const t = animationArray.subarray(arrayIndex + 4, arrayIndex + 7)
            const s = animationArray.subarray(arrayIndex + 7, arrayIndex + 10)
            mat4.fromRotationTranslationScale(jointNodes[i].localForwardMatrix, r, t, s)
        }
    }

    updateJoints() {
        const gl = this.gl
        const skins = this.skins

        for (const skin of skins) {
            const numJoints = skin.jointCount
            for (let i = 0; i < numJoints; i++) {
                const index = skin.jointStart + i
                if (this.jointParents[index] === -1) {
                    mat4.copy(this.globalForwardMatrices[index], this.localForwardMatrices[index])
                }
                else {
                    mat4.mul(this.globalForwardMatrices[index], this.globalForwardMatrices[this.jointParents[index]], this.localForwardMatrices[index])
                }
                mat4.mul(this.jointMatrices[index], this.globalForwardMatrices[index], this.inverseBindMatrices[index])
            }
            gl.bindBuffer(gl.UNIFORM_BUFFER, skin.uboBuffer)
            gl.bufferSubData(gl.UNIFORM_BUFFER, 0, skin.buffer)
            // gl.bufferData(gl.UNIFORM_BUFFER, skin.buffer, gl.DYNAMIC_DRAW)
        }
    }
}

/*
export class IK extends Component {
    private gltfMesh: GLTFMesh
    private skins: SkinsInfo

    meshTransformMat: mat4

    feetTargets = [ vec3.create(), vec3.create() ]
    feetPositions = [ vec3.create(), vec3.create() ]
    feet = [ vec3.create(), vec3.create() ]
    legsNodes: JointNode[][] = []
    feetAnchored = [ true, true ]
    feetPreviousPosition = [ vec3.create(), vec3.create() ]

    transform: Transform

    constructor(parent: GameObject, mesh: GLTFMesh, meshTransformMat: mat4) {
        super(parent)

        this.gltfMesh = mesh
        this.skins = mesh.skins
        this.meshTransformMat = meshTransformMat

        this.transform = this.parent.transform
    }

    Init() {
        const leftFootJoint = this.skins.jointNodes.find((n) => n.name === 'mixamorig:LeftFoot') as JointNode
        vec3.transformMat4(this.feet[0], this.feet[0], leftFootJoint.globalForwardMatrix)
        vec3.transformMat4(this.feet[0], this.feet[0], this.meshTransformMat)
        
        const rightFootJoint = this.skins.jointNodes.find((n) => n.name === 'mixamorig:RightFoot') as JointNode
        vec3.transformMat4(this.feet[1], this.feet[1], rightFootJoint.globalForwardMatrix)
        vec3.transformMat4(this.feet[1], this.feet[1], this.meshTransformMat)

        const transformMat = this.transform.getMatrix()

        vec3.transformMat4(this.feetTargets[0], this.feet[0], transformMat)
        vec3.copy(this.feetPositions[0], this.feetTargets[0])

        vec3.transformMat4(this.feetTargets[1], this.feet[1], transformMat)
        vec3.copy(this.feetPositions[1], this.feetTargets[1])

        this.legsNodes[0] = [
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:LeftUpLeg') as JointNode,
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:LeftLeg') as JointNode,
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:LeftFoot') as JointNode,
        ]

        this.legsNodes[1] = [
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:RightUpLeg') as JointNode,
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:RightLeg') as JointNode,
            this.skins.jointNodes.find((n) => n.name === 'mixamorig:RightFoot') as JointNode,
        ]

        const hips = this.skins.jointNodes.find((n) => n.name === 'mixamorig:Hips') as JointNode
        hips.translation[2] += 10

        ///////////////////////// DEPRECATED
        this.gltfMesh.updateJoints()
        /////////////////////////
    }

    update(objectTransformMat: mat4, velocity: vec3, helpersPositions: [vec3, vec3]) {
        if (this.feetAnchored[0] === false) {
            this.feetTargets[0][2] = this.feetPreviousPosition[0][2] + velocity[2] / 2
            if (this.feetTargets[0][2] <= this.transform.position[2]) {
                this.feetAnchored[0] = true
                console.log('anchored')
            }
        }
        if (this.feetAnchored[1] === false) {
            this.feetTargets[1][2] = this.feetPreviousPosition[1][2] + velocity[2] / 2
            if (this.feetTargets[1][2] <= this.transform.position[2]) {
                this.feetAnchored[1] = true
                console.log('anchored')
            }
        }
        if (this.feetAnchored[0] === true && this.feetAnchored[1] === true) {
            if (velocity[2] > 0.0001) {
                const closestIndex = this.feetTargets[0][2] > this.feetTargets[1][2] ? 1 : 0
                console.log(closestIndex)
                vec3.copy(this.feetPreviousPosition[closestIndex], this.feetTargets[closestIndex])
                this.feetTargets[closestIndex][2] = this.feetPreviousPosition[closestIndex][2] + velocity[2] / 2
                this.feetAnchored[closestIndex] = false
            }
        }
        vec3.copy(helpersPositions[0], this.feetTargets[0])
        vec3.copy(helpersPositions[1], this.feetTargets[1])

        const transformMat = mat4.mul(mat4.create(), objectTransformMat, this.meshTransformMat)

        this.ccd(transformMat, this.legsNodes[0], this.feetTargets[0])
        this.ccd(transformMat, this.legsNodes[1], this.feetTargets[1])
    }

    ccd(transformMat: mat4, nodes: JointNode[], target: vec3) {
        const numIter = 3
        for (let iter = 0; iter < numIter; iter++) {
            for (let i = 0; i < 3; i++) {
                const nMat = mat4.mul(mat4.create(), transformMat, nodes[i].globalForwardMatrix)
                const inv = mat4.invert(mat4.create(), nMat)
                const targetLocal = vec3.transformMat4(vec3.create(), target, inv)
                const eff = vec3.fromValues(0, 0, 0)

                for (let j = nodes.length - 1; j > i; j--) {
                    vec3.transformMat4(eff, eff, nodes[j].localForwardMatrix)
                }

                vec3.normalize(eff, eff)
                vec3.normalize(targetLocal, targetLocal)
                const rot = quat.rotationTo(quat.create(), eff, targetLocal)
                quat.mul(nodes[i].rotation, nodes[i].rotation, rot)

                mat4.fromRotationTranslationScale(nodes[i].localForwardMatrix, nodes[i].rotation, nodes[i].translation, nodes[i].scale)
                for (let j = i; j < nodes.length; j++) {
                    mat4.mul(nodes[j].globalForwardMatrix, nodes[j].parent!.globalForwardMatrix, nodes[j].localForwardMatrix)
                }
            }
        }
        ///////////////////////// DEPRECATED
        this.gltfMesh.updateJoints()
        /////////////////////////
    }
}
*/

export class Animator extends Component {
    gltf: GLTFMesh
    skins: GLTFSkins
    animations: Animation[]
    animationArrays: Float32Array[]

    constructor(parent: GameObject, gltf: GLTFMesh, animations: GLTFRawAnimation[]) {
        super(parent)

        this.gltf = gltf
        this.skins = gltf.skins

        this.animationArrays = [
            new Float32Array(this.skins.jointNodes.length * (3 + 3 + 4)),
            new Float32Array(this.skins.jointNodes.length * (3 + 3 + 4)),
        ]

        this.animations = animations.map(rawAnimation => {
            const check = new Uint8Array(this.skins.jointNodes.length).fill(0b111)

            const channels: Animation['channels'] = rawAnimation.channels.map(channel => {
                const nodeIdx = this.skins.jointNodes.findIndex(n => n.name === channel.target.name)
                assert(nodeIdx !== -1)

                let index = nodeIdx * 10
                if (channel.target.path === 'rotation') {
                    check[nodeIdx] ^= 0b001
                    index += 0
                }
                else if (channel.target.path === 'translation') {
                    check[nodeIdx] ^= 0b010
                    index += 4
                }
                else if (channel.target.path === 'scale') {
                    check[nodeIdx] ^= 0b100
                    index += 7
                }

                return {
                    output: channel.output,
                    size: channel.target.path === 'rotation' ? 4 : 3,
                    target: index,
                }
            })

            // asserts that the animation modifies every jointNode's rotation, translation and scale
            assert(check.reduce((acc, x) => acc | x, 0) === 0)

            return {
                duration: rawAnimation.duration,
                inputs: rawAnimation.inputs,
                channels: channels,
            }
        })
    }

    blend(index0: number, index1: number, blendIndex: number, t: number) {
        this.calcAnimation(index0, t, 0)
        this.calcAnimation(index1, t, 1)

        for (let i = 0; i < this.skins.jointNodes.length; i++) {
            const index = i * (3 + 3 + 4)
            quat.slerp(
                this.animationArrays[0].subarray(index, index+4),
                this.animationArrays[0].subarray(index, index+4),
                this.animationArrays[1].subarray(index, index+4),
                blendIndex
            )
            vec3.lerp(
                this.animationArrays[0].subarray(index+4, index+7),
                this.animationArrays[0].subarray(index+4, index+7),
                this.animationArrays[1].subarray(index+4, index+7),
                blendIndex
            )
            vec3.lerp(
                this.animationArrays[0].subarray(index+7, index+10),
                this.animationArrays[0].subarray(index+7, index+10),
                this.animationArrays[1].subarray(index+7, index+10),
                blendIndex
            )
        }
        this.updateJoints()
    }

    play(index: number, t: number) {
        this.calcAnimation(index, t, 0)
        this.updateJoints()
    }

    private calcAnimation(index: number, t: number, animationArrayIndex: number) {
        const animation = this.animations[index]
        const numKeyframes = animation.inputs.length
        t = t % animation.duration
        const inputIdx0 = (animation.inputs.findIndex(v => v > t) + numKeyframes - 1) % numKeyframes
        const inputIdx1 = (inputIdx0 + 1) % numKeyframes
        const s1 = (t - animation.inputs[inputIdx0]) / (animation.inputs[inputIdx1] - animation.inputs[inputIdx0])
        const vec3Idx0 = inputIdx0*3
        const quatIdx0 = inputIdx0*4
        const vec3Idx1 = inputIdx1*3
        const quatIdx1 = inputIdx1*4

        for (const channel of animation.channels) {
            if (channel.size === 3) {
                const a = channel.output.subarray(vec3Idx0, vec3Idx0+3)
                const b = channel.output.subarray(vec3Idx1, vec3Idx1+3)
                const o = this.animationArrays[animationArrayIndex].subarray(channel.target, channel.target+3)
                vec3.lerp(o, a, b, s1)
            }
            else {
                const a = channel.output.subarray(quatIdx0, quatIdx0+4)
                const b = channel.output.subarray(quatIdx1, quatIdx1+4)
                const o = this.animationArrays[animationArrayIndex].subarray(channel.target, channel.target+4)
                quat.slerp(o, a, b, s1)
            }
        }
    }

    private updateJoints() {
        this.skins.updateJointForwardMatrices(this.animationArrays[0])
        this.skins.updateJoints()
    }
}

export class GLTFMesh {
    #gl: WebGL2RenderingContext
    #meshes: Mesh[]
    #meshInstanceNum: number[]
    #drawFuncs: ((transform: mat4, cameraTransform: mat4, cameraProjection: mat4) => void)[]
    #skins: GLTFSkins

    constructor(gl: WebGL2RenderingContext, meshes: Mesh[], skins: SkinsInfo, meshInstanceNum: number[]) {
        this.#gl = gl
        this.#meshes = meshes
        this.#skins = new GLTFSkins(this.#gl, skins)
        this.#meshInstanceNum = meshInstanceNum
        this.#drawFuncs = []

        this.#skins.resetJointForwardMatrices()
        this.#skins.updateJoints()

        for (const [i, mesh] of this.#meshes.entries()) {
            for (const primitive of mesh.primitives) {
                const uCameraLocation = gl.getUniformLocation(primitive.program, 'uCamera')
                const uProjectionLocation = gl.getUniformLocation(primitive.program, 'uProjection')
                const uTransformLocation = gl.getUniformLocation(primitive.program, 'uTransform')
                const numInstance = this.#meshInstanceNum[i]

                if (numInstance === 1) {
                    this.#drawFuncs.push((transform: mat4, cameraTransform: mat4, cameraProjection: mat4) => {
                        gl.useProgram(primitive.program)
                        gl.uniformMatrix4fv(uCameraLocation, false, cameraTransform)
                        gl.uniformMatrix4fv(uProjectionLocation, false, cameraProjection)
                        gl.uniformMatrix4fv(uTransformLocation, false, transform)

                        if (mesh.skin !== undefined) {
                            gl.bindBufferBase(gl.UNIFORM_BUFFER, primitive.skinUBOIndex!, mesh.skin.uboBuffer)
                        }

                        gl.bindVertexArray(primitive.vao)
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices.buffer)
                        gl.drawElements(primitive.mode, primitive.count, primitive.indicesType, 0)
                    })
                }
                else {
                    this.#drawFuncs.push((transform: mat4, cameraTransform: mat4, cameraProjection: mat4) => {
                        gl.useProgram(primitive.program)
                        gl.uniformMatrix4fv(uCameraLocation, false, cameraTransform)
                        gl.uniformMatrix4fv(uProjectionLocation, false, cameraProjection)
                        gl.uniformMatrix4fv(uTransformLocation, false, transform)
                        gl.bindVertexArray(primitive.vao)
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primitive.indices.buffer)
                        gl.drawElementsInstanced(primitive.mode, primitive.count, primitive.indicesType, 0, numInstance)
                    })
                }
            }
        }
    }

    get skins() {
        return this.#skins
    }

    get meshes() {
        return this.#meshes
    }

    render(transform: mat4, cameraTransform: mat4, cameraProjection: mat4) {
        for (const drawFunc of this.#drawFuncs) {
            drawFunc(transform, cameraTransform, cameraProjection)
        }
    }
}

export class GLTFLoader {
    #gl: WebGL2RenderingContext = <WebGL2RenderingContext><unknown>null
    #gltf: GLTF.GLTF = { asset: { version: '' } }
    #buffers: Uint8Array[] = []
    #parsedBufferViews: ParsedBufferView[] = []
    #meshes: Mesh[] = []
    #skins: SkinsInfo = {
        skins: [],
        jointNodes: [],
        inverseBindMatrices: [],
        localForwardMatrices: [],
        globalForwardMatrices: [],
        jointParents: [],
        jointMatrices: [],
    }
    #skinNodes: GLTF.GLTFNode[] = []

    #instances: {matrix: mat4, node: GLTF.GLTFNode}[][] = []

    async load(gl: WebGL2RenderingContext, filename: string) {
        this.#gl = gl
        this.#gltf = await fetch(filename).then(f => f.json())

        this.#buffers = this.#gltf.buffers?.map(buffer => this.parseBuffer(buffer)) ?? []
        this.#parsedBufferViews = Array(this.#gltf.bufferViews?.length ?? 0)

        let mesh: GLTFMesh | undefined = undefined
        if (this.#gltf.meshes !== undefined) {
            this.#instances = this.#gltf.meshes?.map(() => []) ?? []

            assert(this.#gltf.scene !== undefined)
            assert(this.#gltf.scenes !== undefined)
            assert(this.#gltf.scenes.length !== undefined)

            const scene = this.#gltf.scenes[this.#gltf.scene]

            assert(scene.nodes !== undefined)
            assert(this.#gltf.nodes !== undefined)

            for (const nodeIdx of scene.nodes) {
                const node = this.#gltf.nodes[nodeIdx]
                this.parseNode(node, null)
            }

            this.#skins = this.parseSkins(this.#gltf.skins ?? [])
            assert(this.#skins.skins.length < 2, 'more than 1 skin: not tested')
            this.createInstances()
            mesh = new GLTFMesh(gl, this.#meshes, this.#skins, this.#instances.map(m => m.length))
        }

        const rawAnimations: GLTFRawAnimation[] | undefined = this.#gltf.animations?.map(animation => this.parseAnimation(animation))

        return {
            mesh,
            rawAnimations,
        }
    }

    createInstances() {
        const gl = this.#gl
        for (let i = 0; i < this.#instances.length; i++) {
            const instance = this.#instances[i]
            assert(instance.length !== 0)
            if (instance.length === 1) {
                const skin = instance[0].node.skin
                this.#meshes[i] = this.parseMesh(this.#gltf.meshes![i], false, skin)
                for (const primitive of this.#meshes[i].primitives) {
                    const uLocalTransformLocation = gl.getUniformLocation(primitive.program, 'uLocalTransform')
                    gl.uniformMatrix4fv(uLocalTransformLocation, false, instance[0].matrix)
                }
            }
            else {
                assert(instance.reduce((acc: boolean, m) => (m.node.skin === undefined && acc), true), 'cannot have skinned instanced meshes')
                this.#meshes[i] = this.parseMesh(this.#gltf.meshes![i], true, undefined)
                const buffer = gl.createBuffer() as WebGLBuffer
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
                const data = new Float32Array(instance.length * 16).map((_, i) => instance[Math.floor(i/16)].matrix[i%16])
                gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
                for (const primitive of this.#meshes[i].primitives) {
                    gl.bindVertexArray(primitive.vao)
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
                    const index = gl.getAttribLocation(primitive.program, 'uLocalTransform')
                    gl.enableVertexAttribArray(index+0)
                    gl.vertexAttribPointer(index+0, 4, gl.FLOAT, false, 64, 0)
                    gl.vertexAttribDivisor(index+0, 1)
                    gl.enableVertexAttribArray(index+1)
                    gl.vertexAttribPointer(index+1, 4, gl.FLOAT, false, 64, 16)
                    gl.vertexAttribDivisor(index+1, 1)
                    gl.enableVertexAttribArray(index+2)
                    gl.vertexAttribPointer(index+2, 4, gl.FLOAT, false, 64, 32)
                    gl.vertexAttribDivisor(index+2, 1)
                    gl.enableVertexAttribArray(index+3)
                    gl.vertexAttribPointer(index+3, 4, gl.FLOAT, false, 64, 48)
                    gl.vertexAttribDivisor(index+3, 1)
                }
            }
        }
        gl.bindVertexArray(null)
    }

    parseNode(node: GLTF.GLTFNode, parentMatrix: mat4 | null) {
        assert(node.camera === undefined)
        assert(node.weights === undefined)

        const matrix = parentMatrix ? mat4.clone(parentMatrix) : mat4.create()

        if (node.matrix) {
            const localMat = mat4.fromValues(...node.matrix)
            mat4.mul(matrix, matrix, localMat)
        }
        else {
            const localMat = mat4.create()
            mat4.fromRotationTranslationScale(
                localMat,
                node.rotation ? quat.fromValues(...node.rotation) : quat.create(),
                node.translation ? vec3.fromValues(...node.translation) : vec3.create(),
                node.scale ? vec3.fromValues(...node.scale) : vec3.fromValues(1,1,1)
            )
            mat4.mul(matrix, matrix, localMat)
        }
        if (node.mesh !== undefined) {
            this.#instances[node.mesh].push({ node: node, matrix })
            if (node.skin !== undefined) {
                this.#skinNodes.push(node)
            }
        }
        else {
            assert(node.skin === undefined, 'a node should not have a skin with no mesh')
        }

        if (node.children) {
            for (const child of node.children) {
                this.parseNode(this.#gltf.nodes![child], matrix)
            }
        }
    }

    parseBuffer(buffer: GLTF.Buffer) {
        assert(buffer.uri !== undefined)

        const match = buffer.uri.match(/^data:application\/octet-stream;base64,(.*)$/)
        assert(match !== null)

        const dataStr = atob(match[1])
        const data = new Uint8Array(dataStr.length).map((_, i) => dataStr.charCodeAt(i))
        return data
    }

    parseBufferView(bufferView: GLTF.BufferView, target: number): ParsedBufferView {
        const gl = this.#gl

        if (bufferView.target !== undefined && bufferView.target !== target) {
            throw new Error('BufferView target does not match inferred target')
        }
        const glBuffer = gl.createBuffer() as WebGLBuffer

        gl.bindBuffer(target, glBuffer)
        gl.bufferData(target, this.#buffers[bufferView.buffer], gl.STATIC_DRAW, bufferView.byteOffset ?? 0, bufferView.byteLength)

        return { buffer: glBuffer, target, stride: bufferView.byteStride ?? 0 }
    }

    parseMaterial(material: GLTF.Material, internalInstancing: boolean, skin?: GLTFSkin) {
        const gl = this.#gl

        const defines: string[] = []
        if (internalInstancing)
            defines.push('INSTANCED')
        if (skin !== undefined)
            defines.push('SKINNED', 'SKIN_MATRICES_NUM ' + skin.jointCount)
        const vSource = vertexShader.replace(/<DEFINES>/, defines.map(d => ('#define ' + d + '\n')).join(''))
        const vShader = loadShader(gl, vSource, 'vertex')
        const fShader = loadShader(gl, fragmentShader, 'fragment')

        const program = gl.createProgram() as WebGLProgram
        gl.attachShader(program, vShader)
        gl.attachShader(program, fShader)
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Could not link program: ' + gl.getProgramInfoLog(program))
        }

        assert(material.pbrMetallicRoughness !== undefined)
        assert(material.pbrMetallicRoughness.baseColorTexture === undefined)
        assert(material.pbrMetallicRoughness.metallicRoughnessTexture === undefined)
        assert(material.emissiveFactor === undefined)
        assert(material.emissiveTexture === undefined)
        assert(material.doubleSided === undefined)
        assert(material.alphaCutoff === undefined)
        assert(material.alphaCutoff === undefined)
        assert(material.alphaMode === undefined)
        assert(material.normalTexture === undefined)
        assert(material.occlusionTexture === undefined)

        gl.useProgram(program)

        const baseColorFactor = new Float32Array(material.pbrMetallicRoughness.baseColorFactor ?? [1,1,1,1])
        gl.uniform4fv(gl.getUniformLocation(program, 'uColor'), baseColorFactor)
        gl.uniform1f(gl.getUniformLocation(program, 'uMetalness'), material.pbrMetallicRoughness.metallicFactor ?? 1)
        gl.uniform1f(gl.getUniformLocation(program, 'uRoughness'), material.pbrMetallicRoughness.roughnessFactor ?? 1)

        return program
    }

    addAttrib(
        attribIndex: number,
        accessor: GLTF.Accessor
    ) {
        const gl = this.#gl
        const bufferViewIdx = accessor.bufferView
        assert(bufferViewIdx !== undefined)
        if (this.#parsedBufferViews[bufferViewIdx] === undefined) {
            this.#parsedBufferViews[bufferViewIdx] = this.parseBufferView(this.#gltf.bufferViews![bufferViewIdx], gl.ARRAY_BUFFER)
        }
        const bufferView = this.#parsedBufferViews[bufferViewIdx]
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferView.buffer)
        gl.enableVertexAttribArray(attribIndex)
        const size = ACCESSOR_SIZE[accessor.type]
        assert(
            accessor.componentType === WebGL2RenderingContext['FLOAT'] ||
                accessor.componentType === WebGL2RenderingContext['UNSIGNED_BYTE']
        )
        if (accessor.componentType === WebGL2RenderingContext['FLOAT']) {
            gl.vertexAttribPointer(attribIndex, size, accessor.componentType, false, bufferView.stride, accessor.byteOffset ?? 0)
        }
        else {
            gl.vertexAttribIPointer(attribIndex, size, accessor.componentType, bufferView.stride, accessor.byteOffset ?? 0)
        }
    }

    parseMesh(mesh: GLTF.Mesh, instanced: boolean, skinIdx?: number): Mesh {
        const skinned = skinIdx !== undefined
        const skin = skinned ? this.#skins.skins[skinIdx] : undefined
        const gl = this.#gl
        const primitives: Primitive[] = mesh.primitives.map(primitive => {
            assert(primitive.material !== undefined)

            const program = this.parseMaterial(this.#gltf.materials![primitive.material], instanced, skin)

            const vao = gl.createVertexArray() as WebGLVertexArrayObject
            gl.bindVertexArray(vao)

            for (const [attributeName, accessorIndex] of Object.entries(primitive.attributes)) {
                const attribIndex = gl.getAttribLocation(program, ATTRIBUTES_MAP[attributeName] ?? attributeName)
                if (attribIndex !== -1) {
                    const accessor = this.#gltf.accessors?.[accessorIndex] as GLTF.Accessor
                    this.addAttrib(attribIndex, accessor)
                }
                else {
                    console.log(attributeName)
                }
            }

            let skinUBOIndex: number | undefined = undefined
            if (skinned) {
                skinUBOIndex = gl.getUniformBlockIndex(program, 'uJoints')
                const blockSize = gl.getActiveUniformBlockParameter(program, skinUBOIndex, gl.UNIFORM_BLOCK_DATA_SIZE)
                assert(blockSize === skin?.buffer.byteLength, 'ubo size does not match buffer size')
            }

            gl.bindVertexArray(null)

            assert(primitive.indices !== undefined)

            const accessor = this.#gltf.accessors![primitive.indices]
            const bufferViewIdx = accessor.bufferView
            assert(bufferViewIdx !== undefined)
            if (this.#parsedBufferViews[bufferViewIdx] === undefined) {
                this.#parsedBufferViews[bufferViewIdx] = this.parseBufferView(this.#gltf.bufferViews![bufferViewIdx], gl.ELEMENT_ARRAY_BUFFER)
            }

            return {
                program,
                vao,
                mode: primitive.mode ?? 4,
                count: accessor.count,
                indices: this.#parsedBufferViews[bufferViewIdx],
                indicesType: accessor.componentType,
                skinUBOIndex,
            }
        })
        return {
            primitives,
            skin,
        }
    }

    getAccessorData(accessor: GLTF.Accessor) {
        assert(accessor.bufferView !== undefined)
        assert(accessor.componentType === WebGL2RenderingContext['FLOAT'])
        assert(!accessor.normalized)
        assert(accessor.sparse === undefined)

        const bufferView = this.#gltf.bufferViews![accessor.bufferView]
        const buffer = this.#buffers![bufferView.buffer]

        assert(bufferView.byteStride === undefined)
        assert(bufferView.target === undefined)

        const numComponent = ACCESSOR_SIZE[accessor.type]
        const offset = (accessor.byteOffset ?? 0) + (bufferView.byteOffset ?? 0)
        const data = new Float32Array(buffer.buffer, offset, accessor.count * numComponent)
        return data
    }

    parseSkins(skinList: GLTF.Skin[]): SkinsInfo {
        const gl = this.#gl
        const jointNodesDict: Record<string, JointNode> = {}

        const jointNodes: JointNode[] = []

        const inverseBindMatrices: mat4[] = []
        const jointMatrices: mat4[] = []
        const localForwardMatrices: mat4[] = []
        const globalForwardMatrices: mat4[] = []
        const jointParents: number[] = []

        const skins: GLTFSkin[] = skinList.map((skin) => {
            assert(skin.skeleton === undefined)
            assert(skin.inverseBindMatrices !== undefined)

            const firstNodeIndex = inverseBindMatrices.length

            const inverseBindMatricesAccessor = this.#gltf.accessors![skin.inverseBindMatrices]
            assert(inverseBindMatricesAccessor.type === 'MAT4')
            assert(inverseBindMatricesAccessor.componentType === WebGL2RenderingContext['FLOAT'])
            const inverseBindMatricesBuffer = this.getAccessorData(inverseBindMatricesAccessor)

            for (let i = 0; i < skin.joints.length; i++) {
                inverseBindMatrices.push(inverseBindMatricesBuffer.subarray(i*16, i*16+16))
                localForwardMatrices.push(mat4.create())
                globalForwardMatrices.push(mat4.create())
                jointParents.push(-1)
            }

            const glBuffer = gl.createBuffer() as WebGLBuffer

            const buffer = new Float32Array(skin.joints.length * 16)
            for (let i = 0; i < skin.joints.length; i++) {
                jointMatrices.push(buffer.subarray(i*16, i*16+16))
            }

            // Assert the joints form a tree with no outside nodes
            // And find the root nodes
            for (const [i, nodeIdx] of skin.joints.entries()) {
                const node = this.#gltf.nodes![nodeIdx]
                assert(node.name !== undefined && (node.name in jointNodesDict) === false)
                assert(node.matrix === undefined)

                const jointNode: JointNode = {
                    name: node.name,
                    defaultRotation: node.rotation ? quat.fromValues(...node.rotation) : quat.create(),
                    defaultTranslation: node.translation ? vec3.fromValues(...node.translation) : vec3.create(),
                    defaultScale: node.scale ? vec3.fromValues(...node.scale) : vec3.fromValues(1,1,1),

                    localForwardMatrix: localForwardMatrices[firstNodeIndex + i],
                    globalForwardMatrix: globalForwardMatrices[firstNodeIndex + i],
                    matrix: jointMatrices[firstNodeIndex + i],

                    parent: null,
                }
                if (node.children) {
                    for (const childIdx of node.children) {
                        const childJointIndex = skin.joints.indexOf(childIdx)
                        // checks if every child is part of the skin
                        // and if the list of joints is ordered (no child should come before its parent in the list)
                        assert(childJointIndex !== -1 && childJointIndex > i)
                        jointParents[childJointIndex] = i
                    }
                }
                const parentIndex = jointParents[firstNodeIndex + i]
                jointNode.parent = parentIndex !== -1 ? jointNodes[parentIndex] : null
                jointNodes.push(jointNode)
            }
            const rootNodes = jointParents.reduce((acc: number[], parent, i) => (parent === -1 ? [...acc, i] : acc), [])
            assert(rootNodes.length === 1)

            return {
                jointStart: firstNodeIndex,
                jointCount: skin.joints.length,
                uboBuffer: glBuffer,
                buffer,
            }
        })

        for (const skin of skins) {
            gl.bindBuffer(gl.UNIFORM_BUFFER, skin.uboBuffer)
            gl.bufferData(gl.UNIFORM_BUFFER, skin.buffer, gl.DYNAMIC_DRAW)
        }

        return {
            skins,
            jointMatrices,

            inverseBindMatrices,
            localForwardMatrices,
            globalForwardMatrices,
            jointParents,

            jointNodes,
        }
    }

    parseAnimation(animation: GLTF.Animation): GLTFRawAnimation {
        const inputIdx = animation.samplers[0].input
        const samplers: {input: Float32Array, output: Float32Array}[] = animation.samplers.map(sampler => {
            // asserts that all samplers share the same input
            assert(sampler.input === inputIdx)
            assert(sampler.interpolation === 'LINEAR' || sampler.interpolation === undefined, 'only the linear interpolation is supported')
            return {
                input: this.getAccessorData(this.#gltf.accessors![sampler.input]),
                output: this.getAccessorData(this.#gltf.accessors![sampler.output]),
            }
        })
        const channels: { output: Float32Array, target: { name: string, path: "rotation" | "translation" | "scale" } }[] = []
        for (const channel of animation.channels) {
            const output = samplers[channel.sampler].output
            assert(channel.target.node !== undefined)
            const targetName = this.#gltf.nodes![channel.target.node].name
            assert(targetName !== undefined)
            assert(channel.target.path === 'translation' || channel.target.path === 'rotation' || channel.target.path === 'scale')
            channels.push({output, target: { name: targetName, path: channel.target.path }})
        }
        return {
            inputs: samplers[0].input,
            channels,
            duration: samplers[0].input[samplers[0].input.length - 1]
        }
    }
}






