import { Events } from "./EventList"
import { bindEvents, deleteEvents, resetEvents, triggerEvent } from "./Events"
import { GameObject } from "./GameObject"
import { GraphicsManager } from "./Graphics"
import { InputsManager } from "./Inputs"
import { InstanceManager } from "./Instance"
import { Manager, ManagerConstructor } from "./Manager"
import { PhysicsManager } from "./Physics"
import { Scene } from "./Scene"
import { TimeManager } from "./Time"
import { Transform, TransformManager } from "./Transform"

const DEFAULT_MANAGERS: ManagerConstructor[] = [
    InstanceManager,
    GraphicsManager,
    InputsManager,
    TimeManager,
    PhysicsManager,
]
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
type SceneConstructor = new (...args: any[]) => Scene
 
export class EngineClass {
    #managers: Array<Manager> = []
    #scenes: Record<string, SceneConstructor> = {}

    gameObjects: Array<GameObject> = []

    Instance = <InstanceManager><unknown>null
    Time = <TimeManager><unknown>null
    Graphics = <GraphicsManager><unknown>null
    Inputs = <InputsManager><unknown>null
    Physics = <PhysicsManager><unknown>null
    Transform = new TransformManager()

    currentScene: Scene | null = null
    _sceneChanged = false
    _setupData: {sceneName: string, data: unknown} = {sceneName: '', data: null}

    stopped = false
    
    async start(scenes: Record<string, SceneConstructor>, initialScene: { sceneName: string, data: unknown }) {
        const managerCtorSet = new Set<ManagerConstructor>(DEFAULT_MANAGERS)
        this.#scenes = scenes
        for (const k in this.#scenes) {
            for (const managerCtor of (<typeof Scene><unknown>this.#scenes[k]).Managers) {
                managerCtorSet.add(managerCtor)
            }
        }
        const arr = []
        for (const managerCtor of managerCtorSet) {
            if ((<any>managerCtor).Init !== undefined) {
                arr.push((<any>managerCtor).Init())
            }
        }
        await Promise.all(arr)
        for (const managerCtor of managerCtorSet) {
            this.#managers.push(new managerCtor())
        }

        this.Instance = this.getManager(InstanceManager)
        this.Time = this.getManager(TimeManager)
        this.Graphics = this.getManager(GraphicsManager)
        this.Inputs = this.getManager(InputsManager)
        this.Physics = this.getManager(PhysicsManager)

        this.enterScene(initialScene).then(() => {
            requestAnimationFrame(this.frame.bind(this));
        })
    }

    async enterScene({sceneName, data}: {sceneName: string, data: unknown}): Promise<void> {
        const sceneCtor = this.#scenes[sceneName]
        const scene = new sceneCtor(this)

        const managerCList = [ ...DEFAULT_MANAGERS, ...(<typeof Scene><unknown>sceneCtor).Managers ]
        const managerList = managerCList.map(c => this.getManager(c))

        for (const manager of managerList) {
            bindEvents(manager, manager);
        }
        for (const manager of managerList) {
            await manager.Setup?.();
        }

        this.Instance.enterScene()
        this.Time.enterScene()

        await scene.Setup?.(data)
        this.currentScene = scene
    }

    exitScene(): void {
        triggerEvent('Exit')

        this.Instance.exitScene()

        resetEvents()
        this.currentScene?.Exit?.()
    }

    changeScene(sceneName: string, data?: unknown): void {
        this._setupData = {sceneName, data}
        this._sceneChanged = true
    }

    frame(now: number): void {
        now = now / 1000;

        this.Time.update(now)
        this.Instance.update()
        triggerEvent('Update')
        this.Physics.update()
        this.Inputs.update()
        triggerEvent('Render')

        if (this._sceneChanged) {
            this.exitScene()
            this.enterScene(this._setupData)
            this._setupData = {sceneName: '', data: {}}
            this._sceneChanged = false
        }

        if (this.stopped === false)
            requestAnimationFrame(this.frame.bind(this));
    }

    triggerEvent<K extends keyof Events>(name: K, data?: Events[K]): void {
        triggerEvent(name, data)
    }

    getManager<T extends Manager>(c: new (...args: unknown[]) => T): T {
        return this.#managers.find(m => m instanceof c) as T
    }
  
    destroy(): void {
        console.log('ENGINE STOPPED')
        this.exitScene()
        for (const manager of this.#managers) {
            manager.Destructor?.()
        }
        this.#managers = []
        deleteEvents()
        this.stopped = true
    }
}
  
