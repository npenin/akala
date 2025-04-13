import { Expressions } from '@akala/core/expressions';
import { CommandResult, Commands, CommandType, Create, Update, Delete } from './commands/command.js';
import { CommandProcessor } from './commands/command-processor.js';
import { ModelDefinition, DbSet } from './shared.js';

const command = Symbol('command');

type commandable<T> = T & { [command]: Commands<T> };

export class Transaction
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public readonly commands: Commands<any>[] = [];

    public enlist<T>(cmd: Commands<T>)
    {
        var indexOfCmd = this.commands.indexOf(cmd);
        if (indexOfCmd == -1)
            this.commands.push(cmd);
    }

    public delist<T>(cmd: Commands<T>)
    {
        var indexOfCmd = this.commands.indexOf(cmd);
        if (indexOfCmd !== -1)
            this.commands.splice(indexOfCmd, 1);
    }
}

export abstract class PersistenceEngine<TOptions = string>
{
    constructor(protected processor: CommandProcessor<TOptions>)
    {
    }

    public abstract init(connection: TOptions): Promise<void>;

    public abstract load<T>(expression: Expressions): PromiseLike<T>;

    protected async *dynamicProxy<T>(result: Iterable<T> | AsyncIterable<T>, model: ModelDefinition<T>)
    {
        for await (var x of result)
        {
            yield dynamicProxy(x, model);
        }
    }

    private transaction: Transaction;

    public dbSet<T = unknown>(name: string | ModelDefinition<T>): DbSet<T>
    {
        if (typeof name == 'string')
        {
            if (!ModelDefinition.definitions[name])
                throw new Error('There is no model for name ' + name)
            return ModelDefinition.definitions[name].dbSet(this);
        }
        else
            return name.dbSet(this);
    }

    public addCommand<T>(cmd: Commands<T>)
    {
        this.transaction.enlist(cmd);
    }

    public serialize<T>(obj: T | commandable<T>, set: DbSet<T>)
    {
        if (typeof obj[command] == 'undefined')
            Object.defineProperty(obj, command, { value: new Create(obj, set.model) });
        if (obj[command])
            this.addCommand(obj[command]);
    }

    public delete<T>(obj: commandable<T>, model: ModelDefinition<T>)
    {
        if (!obj[command] || obj[command].type != CommandType.Delete)
        {
            if (obj[command] === null)
            {
                this.transaction.delist(obj[command]);
                obj[command] = new Delete(obj, model);
            }
        }
    }

    public beginTransaction(transaction?: Transaction): Transaction
    {
        if (!transaction)
            transaction = new Transaction();
        this.transaction = transaction;
        return transaction;
    }

    public commitTransaction(transaction?: Transaction)
    {
        if (!transaction && !this.transaction)
            throw new Error('There is no pending transaction to commit');

        const result = this.process(...(transaction || this.transaction).commands);
        this.transaction = undefined;
        return result;
    }

    public process(...commands: Commands<unknown>[]): PromiseLike<CommandResult[]>
    {
        return this.processor.visitCommands(commands);
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export const dynamicProxy = function <T extends Object>(target: T, model: ModelDefinition<T>)
{
    let updateCommand: Update<T> = null;
    return new Proxy<T>(target, {
        set(target, property, value)
        {
            if (!updateCommand)
                updateCommand = new Update(target, model);
            target[property] = value;
            return true;
        },
        get(target, property)
        {
            if (property === command)
                return updateCommand;
            return target[property];
        }
    })
};
