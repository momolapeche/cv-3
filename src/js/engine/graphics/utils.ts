import { ALBEDO_INDEX, EMISSION_INDEX, MATERIAL_INDEX, NORMAL_INDEX, POSITION_INDEX } from "../Graphics"

export function bindGBuffer(gl: WebGL2RenderingContext, program: WebGLProgram) {
    const uPositionLocation = gl.getUniformLocation(program, 'uPosition')
    const uAlbedoLocation = gl.getUniformLocation(program, 'uAlbedo')
    const uNormalLocation = gl.getUniformLocation(program, 'uNormal')
    const uMaterialLocation = gl.getUniformLocation(program, 'uMaterial')
    const uEmissionLocation = gl.getUniformLocation(program, 'uEmission')

    gl.useProgram(program)
    gl.uniform1i(uPositionLocation, POSITION_INDEX)
    gl.uniform1i(uAlbedoLocation, ALBEDO_INDEX)
    gl.uniform1i(uNormalLocation, NORMAL_INDEX)
    gl.uniform1i(uEmissionLocation, EMISSION_INDEX)
    gl.uniform1i(uMaterialLocation, MATERIAL_INDEX)
}

export async function fetchShaderSrc(filename: string) {
    return fetch('/engine/graphics/shaders/' + filename + '.glsl').then(f => f.text())
}

export function compileShader(gl: WebGL2RenderingContext, src: string, type: 'vertex' | 'fragment') {
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

export function createProgram(gl: WebGL2RenderingContext, shaders: [WebGLShader, WebGLShader]) {
    const program = gl.createProgram() as WebGLProgram
    if (program === null) {
        throw new Error('Could not create program')
    }
    gl.attachShader(program, shaders[0])
    gl.attachShader(program, shaders[1])

    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Could not link program: ' + gl.getProgramInfoLog(program))
    }
    return program
}

export function createTextureAndBindToFramebuffer(gl: WebGL2RenderingContext, index: number) {
    const texture = gl.createTexture() as WebGLTexture
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.FLOAT, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture, 0)
    return texture
}

export function framebufferStatus(gl: WebGL2RenderingContext) {
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error("Error: Incomplete Framebuffer: ", status)
    }
}
