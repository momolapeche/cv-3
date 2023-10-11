type Extensions = unknown
type Extras = unknown

export interface AccessorSparseIndices {
    bufferView: number,
    byteOffset?: number,
    componentType: number,
    extensions?: Extensions,
    extras?: Extras,
}

export interface AccessorSparseValues {
    bufferView: number,
    byteOffset?: number,
    extensions?: Extensions,
    extras?: Extras,
}

export interface AccessorSparse {
    count: number,
    indices: AccessorSparseIndices,
    values: AccessorSparseValues,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Accessor {
    bufferView?: number,
    byteOffset?: number,
    componentType: number,
    normalized?: boolean,
    count: number,
    type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT2' | 'MAT3' | 'MAT4',
    max?: number[],
    min?: number[],
    sparse?: AccessorSparse,
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface AnimationChannelTarget {
    node?: number,
    path: string,
    extensions?: Extensions,
    extras?: Extras,
}
export interface AnimationChannel {
    sampler: number,
    target: AnimationChannelTarget,
    extensions?: Extensions,
    extras?: Extras,
}
export interface AnimationSampler {
    input: number,
    interpolation?: "LINEAR" | "STEP" | "CUBICSPLINE",
    output: number,
    extensions?: Extensions,
    extras?: Extras,
}
export interface Animation {
    channels: AnimationChannel[],
    samplers: AnimationSampler[],
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Asset {
    copyright?: string,
    generator?: string,
    version: string,
    minVersion?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Buffer {
    uri?: string,
    byteLength: number,
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface BufferView {
    buffer: number,
    byteOffset?: number,
    byteLength: number,
    byteStride?: number,
    target?: number,
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface TextureInfo {
    index: number,
    texCoord?: number,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Material_PBRMetallicRoughness {
    baseColorFactor?: number[],
    baseColorTexture?: TextureInfo,
    metallicFactor?: number,
    roughnessFactor?: number,
    metallicRoughnessTexture?: TextureInfo,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Material_NormalTextureInfo {
    index: number,
    texCoord?: number,
    scale?: number,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Material_OcclusionTextureInfo {
    index: number,
    texCoord?: number,
    strength?: number,
    extensions?: Extensions,
    extras?: Extras,
}

export interface Material {
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
    pbrMetallicRoughness?: Material_PBRMetallicRoughness,
    normalTexture?: Material_NormalTextureInfo,
    occlusionTexture?: Material_OcclusionTextureInfo,
    emissiveTexture?: TextureInfo,
    emissiveFactor?: number[],
    alphaMode?: string,
    alphaCutoff?: number,
    doubleSided?: boolean,
}


export interface Mesh_Primitive {
    attributes: Record<string, number>,
    indices?: number,
    material?: number,
    mode?: number,
    targets?: unknown[],
    extensions?: Extensions,
    extras?: Extras,
}

export interface Mesh {
    primitives: Mesh_Primitive[],
    weights?: number[],
    name?: string,
    extensions?: Extensions,
    extras?: Extras
}

export interface GLTFNode {
    camera?: number,
    children?: number[],
    skin?: number,
    matrix?: [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
    ],
    mesh?: number,
    rotation?: [ number, number, number, number ],
    scale?: [ number, number, number ],
    translation?: [ number, number, number ],
    weights?: number[],
    name?: string,
    extensions?: Extensions,
    extras?: Extras
}

export interface Scene {
    name?: string,
    nodes?: number[],
    extensions?: Extensions,
    extras?: Extras,
}

export interface Skin {
    inverseBindMatrices?: number,
    skeleton?: number,
    joints: number[],
    name?: string,
    extensions?: Extensions,
    extras?: Extras,
}

export interface GLTF {
    extensionsUsed?: string[],
    extensionsRequired?: string[],
    accessors?: Accessor[],
    animations?: Animation[],
    asset: Asset,
    buffers?: Buffer[],
    bufferViews?: BufferView[],
    cameras?: unknown,
    images?: unknown,
    materials?: Material[],
    meshes?: Mesh[],
    nodes?: GLTFNode[],
    samplers?: unknown,
    scene?: number,
    scenes?: Scene[],
    skins?: Skin[],
    textures?: unknown,
    extensions?: Extensions,
    extras?: Extras,
}
