import "reflect-metadata";
import { FieldType, StorageFieldType, ModelDefinition, Relationship, Attribute, StorageField, StorageView, Generator, SerializableDefinition, SerializedAttribute, SerializedFieldType, SerializedRelationship, SerializedStorageField } from './common.js';
import { Query } from './Query.js';
// import { PersistenceEngine, Transaction } from './PersistenceEngine.js';
import { Update, Create, Delete, CommandResult } from './commands/command.js';
import { types } from 'util';

import * as Enumerable from './Enumerable.js'
import { ICustomResolver } from "@akala/core";

export { Cardinality } from './cardinality.js'
export { ModelDefinition, Relationship, Attribute, StorageField, StorageView, Generator, SerializableDefinition, SerializedAttribute, SerializedFieldType, SerializedRelationship, SerializedStorageField };
// export { PersistenceEngine, dynamicProxy } from './PersistenceEngine.js'

export interface DbSet<T, TRawQuery = unknown> extends Query<T, TRawQuery>, ICustomResolver
{
    model: ModelDefinition<T>;
    update(record: T): Update<T>;
    delete(record: T): Delete<T>;
    create(record: T): Create<T>;
    raw<U>(query: TRawQuery): PromiseLike<U>
    updateSingle(record: T): PromiseLike<CommandResult>;
    deleteSingle(record: T): PromiseLike<CommandResult>;
    createSingle(record: T): PromiseLike<CommandResult>;
}

export type DbSetType<T> = T extends DbSet<infer X, unknown> ? X : never;

export function Model<TObject>(name: (new () => TObject)): void
export function Model<TObject>(name: string, nameInStorage?: string, namespace?: string): (ctor: new () => TObject) => void
export function Model<TObject>(name: string | (new () => TObject), nameInStorage?: string, namespace?: string): void | ((ctor: new () => TObject) => void)
{
    if (typeof name !== 'string')
        return Model<TObject>(name.name)(name);
    let name_s = name;
    return function <TObject>(cl: (new () => TObject))
    {
        let model: ModelDefinition<TObject> = Reflect.getMetadata('db:model', cl.prototype)
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
        }
        // Object.setPrototypeOf(model, cl.prototype);
        // cl.prototype = model;
    }
}

export { Enumerable };

export function Field(type?: FieldType | (() => FieldType), generator?: Generator)
//eslint-disable-next-line @typescript-eslint/no-explicit-any
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
//eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T>(target: any, propertyKey: Extract<keyof T, string>, descriptor?: TypedPropertyDescriptor<T>)
    {
        let model: ModelDefinition<T> = Reflect.getMetadata('db:model', target);

        if (typeof model == 'undefined')
            Reflect.metadata('db:model', model = new ModelDefinition<T>(null, null, null))(target);

        if (typeof type != 'undefined')
            if (typeof type == 'function')
                model.defineMember(propertyKey, isKey, type(), generator);
            else
                model.defineMember(propertyKey, isKey, type, generator);
        else 
        {
            const designType = Reflect.getMetadata('design:type', target, propertyKey);
            if (typeof descriptor == 'undefined')
            {
                let value: T;
                descriptor = { get() { return value; }, set(newValue) { value = newValue } };
                Object.defineProperty(target, propertyKey, descriptor);
            }

            if (designType === String)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.string(), generator);
                const set = descriptor.set;
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
                const set = descriptor.set;
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
                const set = descriptor.set;
                descriptor.set = function (value: T)
                {
                    if (typeof value != 'object' || !types.isDate(value) || isNaN(value.getTime()))
                        throw new TypeError("Invalid type.");
                    set(value);
                }
            }
            else if (designType === Boolean)
            {
                model.defineMember(propertyKey, isKey, StorageFieldType.boolean(), generator);

                const set = descriptor.set;
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


export { StorageFieldType as Types, FieldType as Type, Field as ModelField } from './common.js'
