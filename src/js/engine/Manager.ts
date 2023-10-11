// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ManagerConstructor = new (...args: any[]) => Manager;

export abstract class Manager {
    static async Init?(): Promise<void>;

    async Setup?(): Promise<void>;
    async Exit?(): Promise<void>;

    Destructor?(): void;
}

