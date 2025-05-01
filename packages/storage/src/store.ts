import { ErrorWithStatus, each } from "@akala/core";
import { CommandResult } from "./commands/command.js";
import { ModelDefinition } from "./common.js";
import { PersistenceEngine, Transaction } from "./PersistenceEngine.js";
import { DbSet, DbSetType } from "./shared.js";

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StoreDefinition<T = any> =
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key in keyof T]: T[key] extends DbSet<any, unknown> ? T[key] : never;
    }

export class Store<TStore extends StoreDefinition>
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static create<TStore extends StoreDefinition>(engine: PersistenceEngine<any>, ...models: ((Exclude<keyof TStore, number | symbol>) | { [key in keyof TStore]: ModelDefinition | (new () => DbSetType<TStore[key]>) })[]): Store<TStore> & StoreDefinition<TStore> & TStore
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Store<TStore>(engine, ...models) as any;
    }

    private constructor(private readonly engine: PersistenceEngine, ...models: ((Exclude<keyof TStore, number | symbol>) | { [key in keyof TStore]: ModelDefinition | (new () => DbSetType<TStore[key]>) })[])
    {
        for (const modelRegistration of models)
        {
            let model: ModelDefinition<unknown>;
            if (typeof modelRegistration === 'string')
            {
                model = this.engine.definitions[modelRegistration];
                if (!model)
                    throw new ErrorWithStatus(404, `The model with name ${modelRegistration} is not (yet ?) registered in the engine`);

                Object.defineProperty(this, model.name, { value: model.dbSet(this.engine) });
                // this.engine.useModel(model);
            }
            else
            {
                each(modelRegistration, (model, name) =>
                {
                    if (!(model instanceof ModelDefinition))
                        model = Reflect.getMetadata('db:model', model.prototype) as ModelDefinition<unknown>;

                    Object.defineProperty(this, name, { value: model.dbSet(this.engine) });
                    this.engine.useModel(model);
                })
            }
        }
    }

    public set<T>(name: keyof TStore & string)
    {
        return this.engine.dbSet<T>(name);
    }

    public beginTransaction(transaction?: Transaction): Transaction
    {
        return this.engine.beginTransaction(transaction);
    }

    public commitTransaction(): PromiseLike<CommandResult[]>
    {
        return this.engine.commitTransaction();
    }
}

export class MultiStore<TStore extends StoreDefinition>
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static create<TStore extends StoreDefinition>(mapping: Record<string, PersistenceEngine<any>>): StoreDefinition<TStore> & TStore
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new MultiStore<TStore>(mapping) as any;
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    private constructor(private readonly mapping: Record<string, PersistenceEngine<any>>)
    {
        for (const name of Object.keys(mapping))
            Object.defineProperty(this, name, { value: mapping[name].dbSet(name) });
    }

    public set<T>(name: keyof TStore & string)
    {
        if (name in this.mapping)
            return this.mapping[name].dbSet<T>(name);
    }
}
