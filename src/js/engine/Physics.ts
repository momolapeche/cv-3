import { ColliderDesc, RigidBody, RigidBodyDesc, World } from '@dimforge/rapier3d'
import { Manager } from './Manager'
import { GameObject } from './GameObject'
import { Engine } from './lib'
import { Component } from './Component'
import { Transform } from './Transform'

export class RigidBodyComponent extends Component {
    collider: ColliderDesc
    rigidBodyDesc: RigidBodyDesc

    constructor(parent: GameObject, collider: ColliderDesc, rigidBodyDesc: RigidBodyDesc) {
        super(parent)

        this.collider = collider
        this.rigidBodyDesc = rigidBodyDesc
    }
    Init() {
        const transform = this.parent.transform
        this.rigidBodyDesc.setTranslation(transform.position[0], transform.position[1], transform.position[2])
        Engine.Physics.addRigidBody(this)
    }
    Destroy() {
        throw new Error('not implemented')
    }
}

export class PhysicsManager extends Manager {
    #world: World = <World><unknown>null
    RAPIER = <typeof import('@dimforge/rapier3d')><unknown>null

    rigidBodies: { rb: RigidBodyComponent, rigidBody: RigidBody }[] = []

    constructor() {
        super()
    }

    async Setup(): Promise<void> {
        this.RAPIER = await import('@dimforge/rapier3d')
        const gravity = {x: 0, y: -10, z: 0}
        this.#world = new this.RAPIER.World(gravity)
    }
    addRigidBody(rb: RigidBodyComponent) {
        const rigidBody = this.#world.createRigidBody(rb.rigidBodyDesc)
        const collider = this.#world.createCollider(rb.collider, rigidBody)
        this.rigidBodies.push({
            rb, rigidBody
        })
    }
    update() {
        this.#world.step()

        for (const rb of this.rigidBodies) {
            const position = rb.rigidBody.translation()
            const pos = rb.rb.parent.transform.position
            pos[0] = position.x
            pos[1] = position.y
            pos[2] = position.z
        }
    }
}
