import { PersistenceEngine, dynamicProxy } from '../PersistenceEngine.js';
import { StrictExpressions } from '@akala/core/expressions';
import { CommandProcessor } from '../commands/command-processor.js';
import { Commands, CommandResult } from '../commands/command.js';
import { ExpressionExecutor } from '../expression-executor.js';
import { ModelDefinition, Generator } from '../shared.js';
import { ErrorWithStatus, HttpStatusCode } from '@akala/core';

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class Vanilla extends PersistenceEngine<VanillaOptions, void>
{
    constructor()
    {
        super(new VanillaCommandProcessor())
    }
    store: VanillaStore;

    public rawQuery<T>(query: void): PromiseLike<T>
    {
        throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'Raw queries are not supported for this provider');
    }

    public async init(options?: VanillaOptions): Promise<void>
    {
        if (!options)
            options = {};
        if (!options.store)
            options.store = {};
        this.store = options.store;
        this.processor.init(options);
    }
    public async load<T>(expression: StrictExpressions): Promise<T>
    {
        const executor = new ExpressionExecutor();
        const oldVisitContant = executor.visitConstant;
        const store = this.store;
        executor.visitConstant = function (cte)
        {
            if (cte.value instanceof ModelDefinition)
            {
                this.result = store[cte.value.namespace]?.[cte.value.nameInStorage] || [];
                this.model = cte.value;
                return cte;
            }
            return oldVisitContant.call(this, cte);
        }
        executor.result = store;
        executor.visit(expression);
        if (executor.model)
            if (Array.isArray(executor.result))
                return this.dynamicProxy(executor.result, executor.model) as unknown as T;
            else
                return dynamicProxy<T>(executor.result as T, executor.model as ModelDefinition<T>);
        else
            return executor.result as T;
    }
}

interface VanillaStore
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    [namespace: string]: { [name: string]: any[] }
}

export interface VanillaOptions
{
    store?: VanillaStore;
}

export class VanillaCommandProcessor extends CommandProcessor<VanillaOptions>
{
    private store: VanillaStore;
    // private engineOptions: VanillaOptions;

    constructor()
    {
        super();
    }

    async visitUpdate<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        const indexOfRecord = this.recordIndex(cmd);
        if (indexOfRecord == -1)
            return { recordsAffected: 0 };
        this.store[cmd.model.namespace][cmd.model.nameInStorage].splice(indexOfRecord, 1, cmd.model);
    }

    private modelStore<T>(model: ModelDefinition<T>)
    {
        return this.store[model.namespace]?.[model.nameInStorage] || []
    }

    private recordIndex<T>(cmd: Commands<T>)
    {
        if (!this.store[cmd.model.namespace]?.[cmd.model.nameInStorage])
            return -1;
        let indexOfRecord = this.modelStore(cmd.model).indexOf(cmd.record);
        if (indexOfRecord == -1)
        {
            const recordEntries = Object.entries(cmd.record);
            indexOfRecord = this.modelStore(cmd.model).findIndex(v =>
            {
                return recordEntries.reduce((prev, current) =>
                {
                    return prev && v[current[0]] === current[1];
                }, true);
            });
        }
        return indexOfRecord;
    }

    async visitDelete<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        const indexOfRecord = this.recordIndex(cmd);
        if (indexOfRecord == -1)
            return { recordsAffected: 0 };
        return { recordsAffected: this.store[cmd.model.namespace][cmd.model.nameInStorage].splice(indexOfRecord, 1).length };
    }
    async visitInsert<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        this.store[cmd.model.namespace] = this.store[cmd.model.namespace] || {};
        this.store[cmd.model.namespace][cmd.model.nameInStorage] = this.store[cmd.model.namespace][cmd.model.nameInStorage] || [];
        this.store[cmd.model.namespace][cmd.model.nameInStorage].push(cmd.record);
        cmd.model.key.forEach(k =>
        {
            switch (cmd.model.members[k].generator)
            {
                case Generator.native:
                case Generator.uuid:
                    cmd.record[k] = crypto.randomUUID();
                    break;
            }
        })
        return { recordsAffected: 1 };
    }
    init(options: VanillaOptions): void
    {
        this.store = options.store;
        // this.engineOptions = options;
    }
}
