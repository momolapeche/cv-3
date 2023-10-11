import { mat4 } from "gl-matrix"
import { GraphicObject, MeshComponent } from "../Graphics"

export class ShadowMapPool {
    private gl: WebGL2RenderingContext
    private shadowMaps: ShadowMap[] = []
    private freeShadowMaps: ShadowMap[] = []

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl
    }

    get() {
        if (this.freeShadowMaps.length === 0) {
            const sm = new ShadowMap(this.gl, this.shadowMaps.length, 1024)
            this.shadowMaps.push(sm)
            this.freeShadowMaps.push(sm)
        }
        const sm = this.freeShadowMaps.pop()!
        sm.inUse = true
        return sm
    }

    free(sm: ShadowMap) {
        if (sm.inUse === true) {
            sm.inUse = false
            this.freeShadowMaps.push(sm)
        }
    }
}

export class ShadowMap {
    private readonly gl: WebGL2RenderingContext
    readonly framebuffer: WebGLFramebuffer
    readonly texture: WebGLTexture
    inUse = false
    id: number
    size: number

    constructor(gl: WebGL2RenderingContext, id: number, size: number) {
        this.gl = gl
        this.id = id

        const framebuffer = gl.createFramebuffer()
        if (framebuffer === null) {
            throw new Error('Could not create framebuffer')
        }
        this.framebuffer = framebuffer

        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

        const texture = gl.createTexture()
        if (texture === null) {
            throw new Error('Could not create texture')
        }
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0)

        this.texture = texture
        this.size = size
    }
    render(objects: GraphicObject[], cameraTransform: mat4, cameraProjection: mat4) {
        const gl = this.gl
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer)
        gl.drawBuffers([])
        gl.viewport(0, 0, this.size, this.size)

        gl.clear(gl.DEPTH_BUFFER_BIT)


        for (const obj of objects) {
            obj.render(cameraTransform, cameraProjection)
        }
    }
}
