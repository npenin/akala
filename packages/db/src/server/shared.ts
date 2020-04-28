import * as akala from '@akala/core'
import "reflect-metadata";
import { FieldType, StorageFieldType, ModelDefinition, Relationship, Attribute, StorageField, StorageView, Generator } from './common';
import { Query } from './Query';
import { Predicate, Project, PredicateAsync } from './expressions/expression';
import { NotSupportedException } from './exceptions';
import { PersistenceEngine } from './PersistenceEngine';
import { Update, Create, Delete, CommandResult } from './commands/command';
import { isDate } from 'util';

export { Cardinality } from './cardinality'
export { ModelDefinition, Relationship, Attribute, StorageField, StorageView, Generator };
export { PersistenceEngine } from './PersistenceEngine'

export var providers = akala.module('db', '@akala/storage');


export interface DbSet<T> extends Query<T>
{
    model: ModelDefinition<T>;
    update(record: T): Update<T>;
    delete(record: T): Delete<T>;
    create(record: T): Create<T>;
    updateSingle(record: T): PromiseLike<CommandResult>;
    deleteSingle(record: T): PromiseLike<CommandResult>;
    createSingle(record: T): PromiseLike<CommandResult>;
}

export interface StoreDefinition
{
    [key: string]: DbSet<any>
}

export class Store<TStore extends StoreDefinition>
{
    public static create<TStore extends StoreDefinition>(engine: PersistenceEngine<any>, ...names: (keyof TStore)[])
    {
        return new Store<TStore>(engine, ...names) as unknown as TStore;
    }

    private constructor(private engine: PersistenceEngine, ...names: (keyof TStore)[])
    {
        for (var name of names)
            Object.defineProperty(this, name, { value: this.set(name as string) });
    }

    public set<T>(name: string)
    {
        return this.engine.dbSet<T>(name);
    }
}

export namespace Enumerable
{
    export function where<T>(source: Iterable<T>, predicate: Predicate<T>): Iterable<T>
    {
        return {
            *[Symbol.iterator]()
            {
                for (var v of source)
                    if (predicate(v))
                        yield v;
            }
        }
    }

    export function whereAsync<T>(source: Iterable<T>, predicate: PredicateAsync<T>): AsyncIterable<T>
    {
        return {
            async *[Symbol.asyncIterator]()
            {
                for await (var v of source)
                    if (await predicate(v))
                        yield v;
            }
        }
    }

    export function any<T>(source: Iterable<T>, predicate: Predicate<T>): boolean
    {
        for (var v of source)
            if (predicate(v))
                return true;
        return false;
    }

    export async function anyAsync<T>(source: Iterable<T>, predicate: PredicateAsync<T>): Promise<boolean>
    {
        for (var v of source)
            if (await predicate(v))
                return true;
        return false;
    }

    export function length<T>(source: { length: number } | Iterable<T>): number
    {
        if (typeof source['length'] != 'undefined')
            return source['length'];

        var i = 0;
        for (var v of source as Iterable<T>)
        {
            i++;
        }
        return i;
    }

    export async function lengthAsync<T>(source: { length: number } | Iterable<T> | AsyncIterable<T>): Promise<number>
    {
        if (typeof source['length'] != 'undefined')
            return source['length'];

        var i = 0;
        for await (var v of source as Iterable<T>)
        {
            i++;
        }
        return i;
    }


    export function select<T, U>(source: Iterable<T>, project: Project<T, U>): Iterable<U>
    {
        return {
            *[Symbol.iterator]()
            {
                for (let value of source)
                    yield project(value);
            }
        }
    }

    export function groupBy<T, U extends string | number>(source: Iterable<T>, criteria: Project<T, U>): Iterable<{ key: U, value: Iterable<T> }>
    {
        return {
            [Symbol.iterator]()
            {
                var groups: { [key: string]: Array<T> } = {};
                var result = [];
                for (let value of source)
                {
                    var group = criteria(value);
                    if (typeof group == 'object')
                        throw new NotSupportedException('Not yet implemented');
                    if (typeof groups[group as string] == 'undefined')
                    {
                        groups[group as string] = [];
                        result.push({ key: this.result, value: groups[this.result] });
                    }
                    groups[group as string].push(value);

                }
                return result[Symbol.iterator]();
            }
        }
    }
}

export function Model<TObject>(name: (new () => TObject)): void
export function Model<TObject>(name: string, nameInStorage?: string, namespace?: string): (ctor: new () => TObject) => void
export function Model<TObject>(name: string | (new () => TObject), nameInStorage?: string, namespace?: string): void | ((ctor: new () => TObject) => void)
{
    if (typeof name !== 'string')
        return Model<TObject>(name.name)(name);
    var name_s = name;
    return function <TObject>(cl: (new () => TObject))
    {
        var model: ModelDefinition<TObject> = Reflect.getMetadata('db:model', cl.prototype)
        if (typeof model == 'undefined')
        {
            if (!name_s && !cl.name)
                throw new Error('Model name is not defined');
            if (!name_s)
                name_s = cl.name;
            model = new ModelDefinition<TObject>(name_s, nameInStorage || name_s, namespace || null);
            Reflect.metadata('db:model', model)(cl.prototype);
        }
        else
        {
            model.name = name_s;
            model.nameInStorage = nameInStorage || name_s;
            model.namespace = namespace || null;
            ModelDefinition.definitions[name_s] = model;
        }
        model.prototype = cl.prototype;
        // cl.prototype = model;
    }
}

export function Field(type?: FieldType | (() => FieldType), generator?: Generator)
export function Field<T>(target: any, propertyKey: string, descriptor?: TypedPropertyDescriptor<T>)
export function Field<T>(type?: FieldType | (() => FieldType), propertyKey?: string | Generator, descriptor?: TypedPropertyDescriptor<T>)
{
    if (typeof propertyKey != 'undefined' && typeof propertyKey != 'number')
    {
        return Field()(type, propertyKey, descriptor);
    }

    return member(false, type, propertyKey);
}

export function Key(type?: FieldType | (() => FieldType), generator?: Generator)
export function Key<T>(target: any, propertyKey: string, descriptor?: TypedPropertyDescriptor<T>)
export function Key<T>(type?: FieldType | (() => FieldType), propertyKey?: string | Generator, descriptor?: TypedPropertyDescriptor<T>)
{
    if (typeof propertyKey != 'undefined' && typeof propertyKey != 'number')
    {
        return Key()(type, propertyKey, descriptor);
    }

    return member(true, type, propertyKey);
}

function member(isKey: boolean, type?: FieldType | (() => FieldType), generator?: Generator)
{
    return function <T>(target: any, propertyKey: Extract<keyof T, string>, descriptor?: TypedPropertyDescriptor<T>)
    {
        var model: ModelDefinition<T> = Reflect.getMetadata('db:model', target);

        if (typeof model == 'undefined')
            Reflect.metadata('db:model', model = new ModelDefinition<T>(null, null, null))(target);

        if (typeof type != 'undefined')
            if (typeof type == 'function')
                model.defineMember(propertyKey, isKey, type(), generator);
            else
                model.defineMember(propertyKey, isKey, type, generator);
        else 
        {
            var designType = Reflect.getMetadata('design:type', target, propertyKey);
            if (typeof descriptor == 'undefined')
            {
                let value: T;
                descriptor = { get() { return value; }, set(newValue) { value = newValue } };
                Object.defineProperty(target, propertyKey, descriptor);
            }

            if (designType === String)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.string(), generator);
                let set = descriptor.set;
                descriptor.set = function (value: T)
                {
                    if (typeof value != 'string')
                        throw new TypeError("Invalid type.");
                    if (value.length > model.members[propertyKey].length)
                        throw new RangeError(`${model.members[propertyKey].length} is the maximum allowed length in ${propertyKey}`);
                    set.call(this, value);
                }
            }
            else if (designType === Number)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.double(), generator);
                let set = descriptor.set;
                descriptor.set = function (value: T)
                {
                    if (typeof value != 'number')
                        throw new TypeError("Invalid type.");
                    set(value);
                }
            }
            else if (designType === Date)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.datetime(), generator);
                let set = descriptor.set;
                descriptor.set = function (value: T)
                {
                    if (typeof value != 'object' || !isDate(value) || isNaN(value.getTime()))
                        throw new TypeError("Invalid type.");
                    set(value);
                }
            }
            else if (designType === Boolean)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.boolean(), generator);

                let set = descriptor.set;
                descriptor.set = function (value: T)
                {
                    if (typeof value != 'boolean')
                        throw new TypeError("Invalid type.");
                    set(value);
                }
            }
            else
                throw new Error(`field '${propertyKey}' type on ${target.name} could not be inferred`);
        }
    }
}


export { StorageFieldType as Types, FieldType as Type, Field as ModelField } from './common'

export { File } from './providers/file'
export { Vanilla } from './providers/vanilla'
export * from './expressions/expression'