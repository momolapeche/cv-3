import { fetchShaderSrc } from "./utils"

type CompileShaderOptions = {
    type: 'vertex' | 'fragment'
    defines?: Record<string, unknown>
    store?: { id: string }
}

export class Shaders {
    private gl: WebGL2RenderingContext
    private srcs: Map<string, string> = new Map()
    private storedShaders: Map<string, WebGLShader> = new Map()
    private rawSrcs: Map<string, string> = new Map()
    private asyncLoadingShaders: Promise<void>[] = []

    constructor(gl: WebGL2RenderingContext) {
        this.gl = gl
    }

    async loadAsync(filename: string, id: string) {
        this.asyncLoadingShaders.push(fetchShaderSrc(filename).then(content => {
            this.rawSrcs.set(id, content)
        }))
    }
    async waitForAll() {
        await Promise.all(this.asyncLoadingShaders)
        const recLoad = (id: string) => {
            let content = this.rawSrcs.get(id) as string
            const m = content.matchAll(/[\t ]*#include\s+<([a-zA-Z0-9_]+)>/g)
            for (const n of m) {
                const src = this.srcs.get(n[1])
                content = content.replace(n[0], src ?? recLoad(n[1]))
            }
            this.rawSrcs.delete(id)
            this.srcs.set(id, content)
            return content
        }
        while (this.rawSrcs.size > 0) {
            recLoad(this.rawSrcs.keys().next().value)
        }
        this.rawSrcs.clear()
        this.asyncLoadingShaders = []
    }

    compileShader(id: string, options: CompileShaderOptions): WebGLShader {
        return this.compileShaderFromStr(this.getSrc(id), options)
    }

    compileShaderFromStr(content: string, options: CompileShaderOptions): WebGLShader {
        const gl = this.gl
        const shader = gl.createShader(options.type === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER)
        if (shader === null) {
            throw new Error(('Could not create shader'));
        }

        const src =
`#version 300 es
${Object.entries(options.defines ?? {}).map(([name, value]) => `#define ${name} ${value}`).join('\n')}
${content}
`

        gl.shaderSource(shader, src)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('Could not compile shader: ' + gl.getShaderInfoLog(shader));
        }

        if (options.store) {
            this.storedShaders.set(options.store.id, shader)
        }

        return shader
    }

    getSrc(id: string) {
        return this.srcs.get(id) ?? ''
    }
    getShader(id: string) {
        return this.storedShaders.get(id) as WebGLShader
    }
}


