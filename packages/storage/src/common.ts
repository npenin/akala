import { DbSet } from './shared.js';
import { Cardinality } from './cardinality.js';
import { Expressions, ConstantExpression } from '@akala/core/expressions';
import { PersistenceEngine } from './PersistenceEngine.js';
import { Query } from './Query.js';
import { PersistenceEngineQueryProvider } from './PersistenceQueryProvider.js';
import { Update, Delete, Create } from './commands/command.js';

export enum StorageType
{
    RelationalDatabase = 0,
    DocumentDatabase = 1,
    KeyValuePair = 2,
}

export class StorageFieldType
{
    static int(): FieldType
    {
        return { type: StorageFieldType.int }
    }
    static string(length?: number): FieldType
    {
        return { type: StorageFieldType.string, length: length || 50 }
    }
    static float(): FieldType
    {
        return { type: StorageFieldType.float }
    }
    static double(): FieldType
    {
        return { type: StorageFieldType.double }
    }
    static boolean(): FieldType
    {
        return { type: StorageFieldType.boolean }
    }
    static date(): FieldType
    {
        return { type: StorageFieldType.date }
    }
    static datetime(): FieldType
    {
        return { type: StorageFieldType.datetime }
    }
}

export function parseType(type: string): FieldType
{
    switch (type.toLowerCase())
    {
        case 'datetime':
            return StorageFieldType.datetime();
    }
}

export interface FieldType
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    type: (...args: any) => FieldType,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any,
    allowNull?: boolean,
    length?: number,
    precision?: number,
    scale?: number,
}


export enum Generator
{
    business,
    native,
    uuid
}

export type SerializedFieldType = keyof StorageFieldType | {
    type: keyof typeof StorageFieldType,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValue?: any,
    allowNull?: boolean,
    length?: number,
    precision?: number,
    scale?: number,
};
export type SerializedAttribute<T, TMember extends Extract<keyof T, string>> = {
    name: TMember,
    nameInStorage: string,
    isKey: boolean,
    mode?: ModelMode.Attribute,
    generator: keyof typeof Generator
} & SerializedFieldType;
export type SerializedRelationship<T, TMember extends keyof T> = {
    name: TMember,
    target: string,
    mode?: ModelMode.Relationship,
    cardinality: Cardinality,
    isComposite?: boolean,
    mapping: {
        [key: string]: string
    };
};
export type SerializedStorageField = {
    isKey: boolean,
    mode?: ModelMode.StorageField,
    nameInStorage: string,
    generator: keyof typeof Generator,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: ModelDefinition<any>
} & SerializedFieldType;


export type Attribute<T, TMember extends Extract<keyof T, string> = Extract<keyof T, string>> = { name: TMember, nameInStorage: string, isKey: boolean, mode: ModelMode.Attribute, generator: Generator, model: ModelDefinition<T> } & FieldType;
export type Relationship<T, TMember extends keyof T = keyof T> = {
    name: TMember,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: ModelDefinition<any>,
    model: ModelDefinition<T>,
    mode: ModelMode.Relationship,
    cardinality: Cardinality,
    isComposite?: boolean,
    mapping: {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        sourceFields: (Attribute<T, any> | StorageField)[], target: ModelDefinition<any>, targetFields: (Attribute<T[TMember], any> | StorageField)[]
    }[]
};
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StorageField = { isKey: boolean, mode: ModelMode.StorageField, nameInStorage: string, generator: Generator, model: ModelDefinition<any> } & FieldType;
//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Field<T = any> = Attribute<T, any> | StorageField;
export enum ModelMode { Attribute, Relationship, StorageField }

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class StorageView<U extends { [key: string]: any }>
{
    constructor(public readonly model: ModelDefinition<U>)
    {

    }

    public get name()
    {
        return this.model.nameInStorage;
    }

    public get namespace()
    {
        return this.model.namespace;
    }

    public get keys()
    {
        return this.model.membersAsArray.filter((attr) => (attr.mode == ModelMode.Attribute || attr.mode == ModelMode.StorageField) && attr.isKey).map(attr => attr.nameInStorage);
    }
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface SerializableDefinition<TObject extends Record<string, any>>
{
    nameInStorage?: string;
    namespace?: string;
    fields?: { [key: string]: SerializedStorageField };
    members?: { [key: string]: SerializedAttribute<TObject, Extract<keyof TObject, string>> };
    relationships?: { [key: string]: SerializedRelationship<TObject, Extract<keyof TObject, string>> };
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ModelDefinition<TObject extends { [key: string]: any } = { [key: string]: any }>
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    static definitions: { [key: string]: ModelDefinition<any> } = {};
    static get definitionsAsArray() { return Object.keys(this.definitions).map((name) => this.definitions[name]); }
    constructor(public name: string, public nameInStorage: string, public namespace: string)
    {
        if (name)
            ModelDefinition.definitions[name] = this;
        if (!nameInStorage)
            this.nameInStorage = name;
    }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public dbSet(engine: PersistenceEngine<any>): DbSet<TObject>
    {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        var model = this;
        return Object.assign(new Query<TObject>(new PersistenceEngineQueryProvider(engine), new ConstantExpression(this)), {
            model, update(record: TObject)
            {
                return new Update(record, model);
            }, delete(record: TObject)
            {
                return new Delete(record, model);
            }, create(record: TObject)
            {
                return new Create(record, model);
            },
            async updateSingle(this: DbSet<TObject>, record: TObject)
            {
                engine.beginTransaction();
                engine.addCommand(this.update(record));
                var result = await engine.commitTransaction();
                return result[0];
            }, async deleteSingle(record: TObject)
            {
                engine.beginTransaction();
                engine.addCommand(this.delete(record));
                var result = await engine.commitTransaction();
                return result[0]
            }, async createSingle(record: TObject)
            {
                engine.beginTransaction();
                engine.addCommand(this.create(record));
                var result = await engine.commitTransaction();
                return result[0]
            },

        });
    }

    fromJson(data: string | SerializableDefinition<TObject>)
    {
        if (typeof data == 'string')
            data = JSON.parse(data);
        if (typeof data != 'object')
            throw new Error(`${data} cannot be read as model ${this.namespace}.${this.name}`);

        const definition = data;

        if (definition.fields)
            Object.entries(definition.fields).forEach(fieldEntry => this.defineStorageMember(fieldEntry[0], fieldEntry[1].isKey, Object.assign({}, fieldEntry[1].type, { type: StorageFieldType[fieldEntry[1].type] }) as FieldType, Generator[fieldEntry[1].generator] as Generator));
        if (definition.relationships)
            Object.entries(definition.relationships).forEach(relationship => this.defineRelationship(relationship[0] as Extract<keyof TObject, string>, ModelDefinition.definitions[relationship[1].target], relationship[1].mapping));
        if (definition.members)
            Object.entries(definition.members).forEach(member => this.defineMember(member[0] as Extract<keyof TObject, string>, member[1].isKey, Object.assign({}, member[1].type, { type: StorageFieldType[member[1].type] }) as FieldType, Generator[member[1].generator] as Generator, member[1].nameInStorage));
    }

    private storageView: StorageView<TObject>;

    public asStorage()
    {
        if (!this.storageView)
            this.storageView = new StorageView(this);
        return this.storageView;
    }

    public discriminator?: Expressions;

    public inherit: ModelDefinition<Partial<TObject>>;

    public readonly members: Partial<{ [k: string]: typeof k extends Extract<keyof TObject, string> ? Attribute<TObject, Extract<keyof TObject, string>> : StorageField }> = {};
    public readonly relationships: Partial<{ [k in keyof TObject]: Relationship<TObject, k> }> = {}

    public get membersAsArray(): (Attribute<TObject> | StorageField)[]
    {
        return Object.keys(this.members).map(k => this.members[k]);
    }

    public get relationshipsAsArray(): Relationship<TObject>[]
    {
        return Object.keys(this.relationships).map(k => this.relationships[k]) as Relationship<TObject>[];
    }

    public get key()
    {
        return this.membersAsArray.filter((attr) => (attr.mode == ModelMode.Attribute || attr.mode == ModelMode.StorageField) && attr.isKey).map(attr => attr.nameInStorage);
    }

    public defineMember<TKey extends Extract<keyof TObject, string>>(name: TKey, isKey: boolean, type: FieldType, generator: Generator = Generator.business, nameInStorage: string = null)
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.members[name] = Object.assign({ name, nameInStorage: nameInStorage || name, isKey, mode: ModelMode.Attribute, generator }, type) as any;
        return this;
    }

    public defineStorageMember(name: string, isKey: boolean, type: FieldType, generator?: Generator)
    public defineStorageMember(name: StorageField & FieldType)
    public defineStorageMember(name: string | StorageField & FieldType, isKey?: boolean, type?: FieldType, generator?: Generator)
    {
        if (typeof name == 'string')
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.members[name] = Object.assign({ name, isKey, mode: ModelMode.StorageField, generator }, type) as any;
        else
            //eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.members[name.nameInStorage] = name as any;
        return this;
    }

    public defineRelationship<TTargetObject>(name: Extract<keyof TObject, string>, targetType: ModelDefinition<TTargetObject>, foreignKeyMapping: { [key: string]: string })
    {
        this.relationships[name] = Object.assign({ name, target: targetType, mode: ModelMode.Relationship });
        for (const fk in foreignKeyMapping)
        {
            if (this.members[fk])
                continue;
            this.defineStorageMember(Object.assign({}, targetType.members[foreignKeyMapping[fk]], { nameInStorage: fk, isKey: false }) as StorageField & FieldType);
        }
    }

    getKeys(record: TObject): Partial<TObject>
    {
        var result: Partial<TObject> = {};
        Object.keys(record).forEach((k =>
        {
            if (~(this.key as string[]).indexOf(k))
                result[k as keyof TObject] = record[k];
        }))
        return result;
    }

    removeKeys(record: TObject): Partial<TObject>
    {
        var result: Partial<TObject> = {};
        Object.keys(record).forEach((k =>
        {
            if (!~(this.key as string[]).indexOf(k))
                result[k as keyof TObject] = record[k];
        }))
        return result;
    }
}

export interface Repository<TObject, TKey>
{
    init(configuration: unknown): void;
    findByKey(key: TKey): PromiseLike<TObject>;
    update(obj: TObject): PromiseLike<void>;
    deleteByKey(key: TKey): PromiseLike<void>;
    delete(obj: TObject): PromiseLike<void>;
}

export abstract class Model<TObject extends { [key: string]: unknown }, TKey extends keyof TObject | (keyof TObject)[]> implements Repository<TObject, TKey extends (keyof TObject)[] ? (TObject[TKey[number]])[] : TKey extends keyof TObject ? TObject[TKey] : never>
{
    abstract init(configuration: unknown): void;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract findByKey(key: TObject[any] | TObject[any][]): PromiseLike<TObject>;
    abstract update(obj: TObject): PromiseLike<void>;
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    abstract deleteByKey(key: TObject[any] | TObject[any][]): PromiseLike<void>;
    delete(obj: TObject): PromiseLike<void>
    {
        if (Array.isArray(this.key))
            return this.deleteByKey(this.key.map((k: keyof TObject) => { return obj[k]; }))
        else
            return this.deleteByKey(obj[this.key as keyof TObject]);
    }

    constructor(public readonly storage: string, protected readonly definition: ModelDefinition<TObject>, protected readonly key: TKey)
    {
    }


}