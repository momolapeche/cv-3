import { Engine } from "../lib"

interface Attribute {
    name: string,
    buffer: WebGLBuffer,
    type: number,
    size: number,
}
export class Geometry {
    indices: { buffer: WebGLBuffer, type: number, count: number }
    attributes: Record<string, Attribute> = {}

    constructor() {
        this.indices = {
            buffer: Engine.Graphics.context.createBuffer() as WebGLBuffer,
            type: 0,
            count: 0,
        }
    }

    setIndices(data: Uint16Array) {
        const gl = Engine.Graphics.context

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices.buffer)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW)

        this.indices.count = data.length
        this.indices.type = gl.UNSIGNED_SHORT
    }

    addAttribute(name: string, data: Float32Array, size: number) {
        const gl = Engine.Graphics.context

        const buffer = gl.createBuffer() as WebGLBuffer
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)

        this.attributes[name] = {
            name,
            buffer,
            type: gl.FLOAT,
            size,
        }
    }

    static Box(sx: number, sy: number, sz: number) {
        const geometry = new Geometry()

        geometry.addAttribute("aPosition", new Float32Array([
            -sx, -sy, +sz,  +sx, -sy, +sz,  -sx, +sy, +sz,
            -sx, +sy, +sz,  +sx, -sy, +sz,  +sx, +sy, +sz,

            -sx, -sy, -sz,  -sx, +sy, -sz,  +sx, -sy, -sz,
            +sx, -sy, -sz,  -sx, +sy, -sz,  +sx, +sy, -sz,

            +sx, -sy, +sz,  +sx, -sy, -sz,  +sx, +sy, +sz,
            +sx, +sy, +sz,  +sx, -sy, -sz,  +sx, +sy, -sz,

            -sx, -sy, +sz,  -sx, +sy, +sz,  -sx, -sy, -sz,
            -sx, -sy, -sz,  -sx, +sy, +sz,  -sx, +sy, -sz,

            -sx, +sy, +sz,  +sx, +sy, +sz,  -sx, +sy, -sz,
            -sx, +sy, -sz,  +sx, +sy, +sz,  +sx, +sy, -sz,

            -sx, -sy, +sz,  -sx, -sy, -sz,  +sx, -sy, +sz,
            +sx, -sy, +sz,  -sx, -sy, -sz,  +sx, -sy, -sz,
        ]), 3)

        geometry.addAttribute("aNormal", new Float32Array([
            0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,
            0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,
            1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,
            -1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,
            0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,
            0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,
        ]), 3)

        geometry.setIndices(new Uint16Array([
            0, 1, 2, 3, 4, 5,       // FRONT
            6, 7, 8, 9, 10, 11,     // BACK
            12, 13, 14, 15, 16, 17, // RIGHT
            18, 19, 20, 21, 22, 23, // LEFT
            24, 25, 26, 27, 28, 29, // TOP
            30, 31, 32, 33, 34, 35, // BOTTOM
        ]))

        return geometry
    }

    static Sphere(radius = 1, numSubdivisions = 3) {
        const p = (1 + Math.sqrt(5)) / 2
        const s = 1 / Math.sqrt(p + 2)
        const t = p * s
        const geometry = new Geometry()

        const positions = [
            0, s, t, 0, -s, t, 0, s, -t, 0, -s, -t,
            s, t, 0, -s, t, 0, s, -t, 0, -s, -t, 0,
            t, 0, s, t, 0, -s, -t, 0, s, -t, 0, -s,
        ]
        const triangles = [
            0, 1, 8, 1, 0, 10, 3, 2, 9, 2, 3, 11,
            4, 5, 0, 5, 4, 2, 7, 6, 1, 6, 7, 3,
            8, 9, 4, 9, 8, 6, 11, 10, 5, 10, 11, 7,
            0, 8, 4, 0, 5, 10, 1, 6, 8, 1, 10, 7,
            2, 4, 9, 5, 2, 11, 6, 3, 9, 3, 7, 11,
        ]

        const indices: number[] = []

        const links: Record<string, number[]> = {}

        function createLink(p0: number, p1: number, n: number) {
            const array = Array(n)
            array[0] = p0
            array[n - 1] = p1

            for (let i = 1; i < n - 1; i++) {
                array[i] = Math.floor(positions.length / 3)
                const s = i / (n - 1)
                const x = positions[p0*3+0]*(1-s) + positions[p1*3+0]*s
                const y = positions[p0*3+1]*(1-s) + positions[p1*3+1]*s
                const z = positions[p0*3+2]*(1-s) + positions[p1*3+2]*s
                const length = 1 / Math.sqrt(x*x+y*y+z*z)
                positions.push(x*length, y*length, z*length)
            }

            return array
        }

        for (let i = 0; i < triangles.length; i += 3) {
            const p0 = triangles[i+0]
            const p1 = triangles[i+1]
            const p2 = triangles[i+2]

            const link01 = links[`${p1},${p0}`]?.reverse() ?? (links[`${p0},${p1}`] = createLink(p0, p1, numSubdivisions + 2))
            const link12 = links[`${p2},${p1}`]?.reverse() ?? (links[`${p1},${p2}`] = createLink(p1, p2, numSubdivisions + 2))
            const link20 = links[`${p0},${p2}`]?.reverse() ?? (links[`${p2},${p0}`] = createLink(p2, p0, numSubdivisions + 2))

            indices.push(
                link01[0],
                link01[1],
                link20[numSubdivisions],
            )
            for (let j = 0; j < numSubdivisions; j++) {
                const line0 = createLink(link01[j + 1], link20[numSubdivisions - j], 2 + j)
                const line1 = j === numSubdivisions - 1 ? link12 : createLink(link01[j + 2], link20[numSubdivisions - j - 1], 3 + j)
                for (let k = 0; k < line0.length; k++) {
                    indices.push(
                        line0[k],
                        line1[k],
                        line1[k+1],
                    )
                    if (k > 0) {
                        indices.push(
                            line0[k],
                            line0[k-1],
                            line1[k],
                        )
                    }
                }
            }
        }

        geometry.addAttribute("aPosition", new Float32Array(positions.map(x => x*radius)), 3)
        geometry.addAttribute("aNormal", new Float32Array(positions), 3)

        geometry.setIndices(new Uint16Array(indices))

        return geometry
    }
}
