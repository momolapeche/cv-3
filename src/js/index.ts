import { mat4, quat, vec3 } from "gl-matrix";
import { GameObject } from "./engine/GameObject";
import { Scene } from "./engine/Scene";
import { Engine, MeshComponent } from "./engine/lib";
import { MaterialFactory } from "./engine/graphics/Material";
import { InstancedMesh, Mesh } from "./engine/graphics/Mesh";
import { Geometry } from "./engine/graphics/Geometry";
import { AmbientLightComponent, DirectionalLightComponent, SpotLightComponent } from "./engine/graphics/Light";
import { Animator, GLTFMesh } from "./engine/graphics/GLTFLoader";
import { RigidBodyComponent } from "./engine/Physics";
import { Particles } from "./engine/graphics/Particles";
import { InstancedPointLightComponent, PointLightComponent } from "./engine/graphics/Light/PointLight";
import { Helper } from "./engine/graphics/Helper";
import { CameraComponent } from "./engine/graphics/Camera";

class Camera extends GameObject {
    constructor() {
        super()

        const fovy = 60/180*Math.PI
        const aspect = Engine.Graphics.context.canvas.width / Engine.Graphics.context.canvas.height
        this.addComponent(new CameraComponent(this, mat4.perspective(mat4.create(), fovy, aspect, 0.01, 100)))
    }
    Init() {
        Engine.Graphics.camera = this.getComponent(CameraComponent)
        this.transform.lookAt(
            vec3.fromValues(0, 1, 4),
            vec3.fromValues(0, -1, 0),
            vec3.fromValues(0,1,0)
        )
    }
    Destroy() {
        Engine.Graphics.camera = null
    }
}

class Ambient extends GameObject {
    constructor() {
        super()

        this.addComponent(new AmbientLightComponent(this, vec3.fromValues(1,1,1), 0.2))
    }
}

class Light extends GameObject {
    constructor(color?: vec3) {
        super()

        this.addComponent(new PointLightComponent(this, {
            color: color ?? vec3.fromValues(1,1,1),
            intensity: 10,
            radius: 30,
        }))
    }
}

class TestGO extends GameObject {
    constructor() {
        super()
        
        this.addComponent(new MeshComponent(this, Engine.Graphics.getGLTFModel('model') as GLTFMesh))
    }

    Update() {
        const t = Engine.Time.time*90
        quat.fromEuler(this.transform.rotation, 0, 0, 0)
    }
}

class RO extends GameObject {
    helper: Helper

    constructor() {
        super()
        
        const geometry = Geometry.Sphere(0.5)

        const vertexShaderSrc = Engine.Graphics.shaders.getSrc('vertexShader')
        const fragmentShaderSrc = Engine.Graphics.shaders.getSrc('fragmentShader')

        const material = new MaterialFactory(Engine.Graphics.context, vertexShaderSrc, fragmentShaderSrc)
            .useNormals()
            .setMetalness(0)
            .setRoughness(0.9)
            .useColor(vec3.fromValues(1,1,1))
            .useEmission(vec3.fromValues(0.1, 0.1, 0.1))
            .build()


        this.addComponent(new PointLightComponent(this, {
            color: vec3.fromValues(1,1,1),
            intensity: 5,
            radius: 3,
        }))

        const mesh = new Mesh(geometry, material)
        this.addComponent(new MeshComponent(this, mesh))

        vec3.set(this.transform.position, 0, 0, 0)

        this.helper = new Helper(Engine.Graphics.context, this.transform, this.getComponent(PointLightComponent))

        this.addComponent(new RigidBodyComponent(this,
            Engine.Physics.RAPIER.ColliderDesc.ball(0.5),
            Engine.Physics.RAPIER.RigidBodyDesc.dynamic()
        ))
    }
    Init() {
        Engine.Graphics.addObject(this.helper)
    }
    Destroy() {
        Engine.Graphics.removeObject(this.helper)
    }
}

class GeoObject extends GameObject {
    part: Particles

    constructor() {
        super()
        
        const geometry = Geometry.Sphere(0.03, 1)

        const vertexShaderSrc = Engine.Graphics.shaders.getSrc('vertexShader')
        const fragmentShaderSrc = Engine.Graphics.shaders.getSrc('fragmentShader')

        const material = new MaterialFactory(Engine.Graphics.context, vertexShaderSrc, fragmentShaderSrc)
            .useNormals()
            .setMetalness(0)
            .setRoughness(0.9)
            .useColor(vec3.fromValues(1,1,1))
            .useEmission(vec3.fromValues(3, 8, 15))
            .build()

        const count = 16
        const lCount = count

        this.addComponent(new InstancedPointLightComponent(this, {
            color: vec3.fromValues(1,1,1),
            intensity: 5,
            radius: 2
        }, lCount, {
            positions: new Float32Array(Array(lCount * 3).fill(0)),
            colors: new Float32Array(Array(lCount).fill(null).map((_) => {
                /*const n = Math.random() * 3
                const idx = Math.floor(n)
                const f = n - idx
                const ret = [0, 0, 0]
                ret[idx] = 1 - f
                ret[(idx + 1) % 3] = f
                return ret*/
                return [0.2,0.6,1]
            }).flat()),
            intensities: new Float32Array(Array(lCount).fill(0.03)),
            radii: new Float32Array(Array(lCount).fill(3))
        }))

        const mesh = new InstancedMesh(geometry, material, null, count)
        this.part = new Particles(
            Engine.Graphics.context,
            mesh.localTransformsBuffer,
            this.getComponent(InstancedPointLightComponent).buffers.position,
            this.getComponent(InstancedPointLightComponent).buffers.intensity,
            count
        )
        this.addComponent(new MeshComponent(this, mesh))

        vec3.set(this.transform.position, 0, 0, 0)

        this.addComponent(new RigidBodyComponent(this,
            Engine.Physics.RAPIER.ColliderDesc.ball(0.5),
            Engine.Physics.RAPIER.RigidBodyDesc.dynamic()
        ))
    }
    Update() {
        this.part.render()
    }
}

class TO extends GameObject {
    constructor() {
        super()
        
        const geometry = Geometry.Sphere(0.1)

        const vertexShaderSrc = Engine.Graphics.shaders.getSrc('vertexShader')
        const fragmentShaderSrc = Engine.Graphics.shaders.getSrc('fragmentShader')

        const material = new MaterialFactory(Engine.Graphics.context, vertexShaderSrc, fragmentShaderSrc)
            .useNormals()
            .setMetalness(0)
            .setRoughness(0.9)
            .useColor(vec3.fromValues(1,1,1))
            .useEmission(vec3.fromValues(2,2,2))
            .build()

        this.addComponent(new MeshComponent(this, new Mesh(geometry, material)))

        // this.addComponent(new PointLightComponent(this, vec3.fromValues(1,1,1), 5, 20))
    }
}

class Floor extends GameObject {
    constructor() {
        super()
        
        this.addComponent(new MeshComponent(this, Engine.Graphics.getGLTFModel('terrain') as GLTFMesh))

        vec3.set(this.transform.position, 0, -2, 0)

        this.addComponent(new RigidBodyComponent(this,
            Engine.Physics.RAPIER.ColliderDesc.cuboid(5, 0.1, 5),
            Engine.Physics.RAPIER.RigidBodyDesc.fixed(),
        ))
    }
}
class YBot extends GameObject {
    model: GLTFMesh
    animator: Animator
    // ik: IK

    velocity: vec3

    constructor() {
        super()
        
        this.model = Engine.Graphics.getGLTFModel('y_bot') as GLTFMesh

        // const meshTransformMat = mat4.fromValues(0.009999999776482582,0,0,0,0,-1.3435885737322906e-9,0.009999999776482582,0,0,-0.009999999776482582,-1.3435885737322906e-9,0,0,0,0,1)
        // this.ik = new IK(this, this.model, meshTransformMat)
        // this.addComponent(this.ik)

        this.addComponent(new MeshComponent(this, this.model))
        this.animator = this.addComponent(new Animator(this, this.model, Engine.Graphics.getGLTFAnimations('y_bot')!))

        vec3.set(this.transform.position, 0, -2, -2)

        this.velocity = vec3.create()
    }

    Update() {
        const acceleration = vec3.create()

        if (Engine.Inputs.get('z')) {
            acceleration[2] -= 1
        }
        if (Engine.Inputs.get('s')) {
            acceleration[2] += 1
        }
        if (Engine.Inputs.get('q')) {
            acceleration[0] -= 1
        }
        if (Engine.Inputs.get('d')) {
            acceleration[0] += 1
        }

        const SPEED = 2
        const deltaTime = Engine.Time.deltaTime

        vec3.normalize(acceleration, acceleration)
        vec3.scale(acceleration, acceleration, SPEED)
        const friction = (acceleration[0] === 0 && acceleration[1] === 0 && acceleration[2] === 0) ? 0.1 : 0
        acceleration[0] -= this.velocity[0] * friction / deltaTime
        acceleration[1] -= this.velocity[1] * friction / deltaTime
        acceleration[2] -= this.velocity[2] * friction / deltaTime

        vec3.scale(acceleration, acceleration, deltaTime)
        vec3.add(this.velocity, this.velocity, acceleration)

        const vLen = vec3.length(this.velocity)
        if (vLen > 2) {
            vec3.scale(this.velocity, this.velocity, 2/vLen)
        }

        if (vLen < 0.001) {
            vec3.set(this.velocity, 0, 0, 0)
        }
        else {
            const rotation = this.transform.rotation
            quat.setAxisAngle(rotation, [0,1,0], Math.atan2(this.velocity[0], this.velocity[2]))
        }

        const position = this.transform.position
        position[0] += this.velocity[0] * deltaTime
        position[1] += this.velocity[1] * deltaTime
        position[2] += this.velocity[2] * deltaTime

        this.animator.blend(2, 1, vLen / 2, Engine.Time.time)
        // this.animator.play(1, Engine.Time.time)

        // this.ik.update(this.transform, this.velocity, [
        //     this.helpers[0].transform.position,
        //     this.helpers[1].transform.position,
        // ])
    }
}

class ZBot extends GameObject {
    model: GLTFMesh
    animator: Animator

    constructor() {
        super()
        
        this.model = Engine.Graphics.getGLTFModel('z_bot') as GLTFMesh

        this.addComponent(new MeshComponent(this, this.model))
        this.animator = this.addComponent(new Animator(this, this.model, Engine.Graphics.getGLTFAnimations('z_bot')!))

        vec3.set(this.transform.position, 0, -2, -2)
    }

    Update() {
        this.animator.play(0, Engine.Time.time)
    }
}

class BasicScene extends Scene {
    async Setup() {
        await Engine.Graphics.loadGLTF('model', '/models/stone.gltf')
        await Engine.Graphics.loadGLTF('terrain', '/models/terrain.gltf')
        await Engine.Graphics.loadGLTF('y_bot', '/models/y_bot.gltf')
        await Engine.Graphics.loadGLTF('y_bot', '/models/y_bot_animations.gltf')
        await Engine.Graphics.loadGLTF('z_bot', '/models/y_bot.gltf')
        await Engine.Graphics.loadGLTF('z_bot', '/models/y_bot_animations.gltf')
        {
            const o = new TestGO()
            vec3.set(o.transform.position, 0, 0, -5)
            Engine.Instance.Instantiate(o)
        }
        /*{
            const light = new GameObject()
            Engine.Graphics.lightManager.addDirectionalLightComponent(light, {
                color: vec3.fromValues(1,1,1),
                intensity: 0.1,
                shadowMap: true,
            })
            quat.setAxisAngle(light.transform.rotation, [1, 0, 0], Math.PI * -3/8)
            vec3.set(light.transform.position, 0, 0, 0)
            Engine.Instance.Instantiate(light)
        }*/
        /*
        {
            const light = new GameObject()
            Engine.Graphics.lightManager.addSpotLightComponent(light, {
                color: vec3.fromValues(1,1,1),
                intensity: 25,
                radius: 30, 
                halfAngle: Math.PI*0.25,
                shadowMap: true
            })
            vec3.set(light.transform.position, -2, 1, 0.5)
            quat.rotationTo(light.transform.rotation, [0, 0, -1], vec3.normalize(vec3.create(), vec3.fromValues(1, -2, 0)))
            Engine.Instance.Instantiate(light)
        }
        */
        // {
        //     const light = new Light(vec3.fromValues(1,.1,.1))
        //     vec3.set(light.transform.position, 3, 0, 0)
        //     Engine.Instance.Instantiate(light)
        // }
        // {
        //     const light = new Light()
        //     vec3.set(light.transform.position, -3, 0, 0)
        //     Engine.Instance.Instantiate(light)
        // }
        Engine.Instance.Instantiate(new YBot())
        // Engine.Instance.Instantiate(new ZBot())
        Engine.Instance.Instantiate(new Floor())
        //Engine.Instance.Instantiate(new RO())
        Engine.Instance.Instantiate(new GeoObject())
        Engine.Instance.Instantiate(new Ambient())
        Engine.Instance.Instantiate(new Camera())
    }
}

export function main() {
    Engine.start({ basic: BasicScene }, { sceneName: "basic", data: null })
}


