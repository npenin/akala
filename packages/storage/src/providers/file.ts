/* eslint-disable @typescript-eslint/no-explicit-any */

import { StrictExpressions, ConstantExpression } from '@akala/core/expressions';
import { PersistenceEngine, dynamicProxy } from '../PersistenceEngine.js';
import { ExpressionExecutor } from '../expression-executor.js';
import * as fs from "fs";
import { basename, join } from "path";
import { CommandProcessor } from '../commands/command-processor.js';
import { CommandResult, Commands, Create } from '../commands/command.js';
import { ModelDefinition } from '../shared.js';
import { promisify } from "util";
import { Generator, ModelDefinitions } from '../common.js';
import { NotSupportedException } from '../exceptions.js';
import { isPromiseLike } from '@akala/core';

export class File extends PersistenceEngine<FileOptions, void>
{
    private store: FileSystemFolder & FileSystemContainer;

    constructor(private readonly fileEntryFactory: (path: string, name: string, def: ModelDefinition) => FileSystemFile)
    {
        const modelDefinitions = {};
        super(new FileCommandProcessor(fileEntryFactory, modelDefinitions), modelDefinitions);
    }

    public async init(options?: { path: string, rootDbName?: string, store?: FileSystemFolder & FileSystemContainer })
    {
        if (!options)
            options = { path: process.cwd() };
        if (!options.rootDbName)
            options.rootDbName = '.';
        if (!options.store)
            options.store = await new FolderEntry(options.path, options.rootDbName, undefined, this.fileEntryFactory, this.definitions) as FileSystemFolder & FileSystemContainer;
        this.store = options.store;
        this.processor.init(options);
    }

    public static async from(path: string, rootDbName: string, fileEntryFactory: (path: string, name: string, def: ModelDefinition) => FileSystemFile)
    {
        const engine = new File(fileEntryFactory);
        await engine.init({ path, rootDbName });
        return engine;
    }

    public static async fromJson(path: string, rootDbName: string = '.')
    {
        return this.from(path, rootDbName, (path, name, def) => new JsonFileEntry(path, name, def));
    }

    public async load<T>(expression: StrictExpressions): Promise<T>
    {
        const executor = new ExpressionExecutor();
        const visitConstant = executor.visitConstant;
        const store = this.store;
        const fileEntryFactory = this.fileEntryFactory;
        const modelDefinitions = this.definitions;
        executor.visitConstant = function <TCte>(this: ExpressionExecutor, cte: ConstantExpression<TCte>)
        {
            // console.log(cte.value)
            if (cte.value instanceof ModelDefinition)
            {
                const model = cte.value as ModelDefinition;
                this.model = model;
                this.result = (async () =>
                {
                    let folder = await Promise.resolve<FileSystemEntries>(store);
                    folder = await store[model.namespace || 'db']
                    if (!folder)
                    {
                        folder = new Proxy(new FolderEntry(store[fspath], model.namespace || 'db', null, fileEntryFactory, modelDefinitions), proxyHandler);
                        folder[isNew] = true;
                    }
                    if (folder[isFile])
                        throw new Error(`found file ${model.namespace || 'db'} while expecting a folder in ${store[fspath]}`);

                    if (!folder[model.nameInStorage])
                    {
                        folder = new Proxy(new FolderEntry(folder[fspath], model.nameInStorage, model, fileEntryFactory, modelDefinitions), proxyHandler);
                        folder[isNew] = true;
                    }
                    else
                        folder = await folder[model.nameInStorage];
                    if (folder[isFile])
                        throw new Error(`found file ${model.nameInStorage} while expecting a folder in ${store[fspath]}`);

                    return folder;
                })();

            }
            else
                return visitConstant.call(this, cte);
        }
        executor.visit(expression);

        let result = executor.result;
        if (isPromiseLike(executor.result))
            result = await executor.result;

        if (typeof result == 'object' && executor.model)
            if (Reflect.has(result, Symbol.iterator) || Reflect.has(result, Symbol.asyncIterator))
                return this.dynamicProxy(result as Iterable<T>, executor.model) as unknown as T;
            else
                return dynamicProxy<T>(result as unknown as T, executor.model as ModelDefinition<T>);
        else
            return result as T;

    }
}

interface FileOptions
{
    path?: string;
    rootDbName?: string;
    store?: FileSystemFolder & FileSystemContainer;
    multipleKeySeparator?: string
}

class FileCommandProcessor extends CommandProcessor<FileOptions>
{
    constructor(private readonly fileEntryFactory: (path: string, name: string, def: ModelDefinition<any>) => FileSystemFile, private readonly modelDefinitions: ModelDefinitions)
    {
        super();
    }

    private store: FileSystemFolder & FileSystemContainer;
    private engineOptions: FileOptions;

    public init(options: FileOptions)
    {
        this.store = options.store;
        this.engineOptions = options;
    }

    private async getFileName<T>(record: T, model: ModelDefinition<T>)
    {
        let fileName = '';
        for (const key of model.key)
        {
            if (fileName)
                fileName += this.engineOptions.multipleKeySeparator || '-'
            if (!record[key] && model.members[key].generator == Generator.uuid)
                record[key] = crypto.randomUUID();
            fileName += await record[key];
        }
        if (fileName == 'then')
            throw new NotSupportedException('the file trying to be saved would result in a name as `then`. This conflicts with the promiselike understanding.');
        return fileName;
    }

    async visitUpdate<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        let folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder?.[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`));
        folder = await folder[cmd.model.nameInStorage]
        if (!folder?.[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`));
        const fileName = await this.getFileName(cmd.record, cmd.model);
        if (typeof folder[fileName] == 'undefined')
            return Promise.reject(new Error(`the file ${fileName} does not exist`));

        if (!folder[fileName][isFile])
            return Promise.reject(new Error(`${folder[fileName][fspath]} is not a file`));

        return (folder[fileName] as FileSystemFile)[save](cmd.record).then(() =>
        {
            return { recordsAffected: 1 };
        })
    }

    async visitDelete<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        let folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder?.[isDirectory])
            throw new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`);
        if (folder[isNew] && folder[isDirectory])
            await folder
        folder = await folder[cmd.model.nameInStorage]
        if (!folder?.[isDirectory])
            throw new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`);
        const fileName = await this.getFileName(cmd.record, cmd.model);
        if (typeof folder[fileName] == 'undefined')
            return { recordsAffected: 0 };

        if (folder[fileName][isFile])
        {
            await promisify(fs.unlink)(folder[fileName][fspath]);

            delete fileContents[folder[fileName][fspath]];

            delete folder[fileName];

            return { recordsAffected: 1 };
        }
        throw new Error('I don\'t know what happened');

    }
    async visitInsert<T>(cmd: Create<T>): Promise<CommandResult>
    {
        await this.store;
        let folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder)
            folder = await (this.store[cmd.model.namespace || 'db'] = createFolder(this.store[fspath], cmd.model.namespace || 'db', null, this.fileEntryFactory, this.modelDefinitions));
        if (!folder?.[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`));

        if (!await folder[cmd.model.nameInStorage])
            folder[cmd.model.nameInStorage] = createFolder(folder[fspath], cmd.model.nameInStorage, cmd.model, this.fileEntryFactory, this.modelDefinitions);
        folder = await folder[cmd.model.nameInStorage]
        if (!folder?.[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`));

        const fileName = await this.getFileName(cmd.record, cmd.model);

        if (!folder[fileName])
        {
            folder[fileName] = new Proxy(this.fileEntryFactory(folder[fspath], fileName, cmd.model), proxyHandler);
            folder[fileName][isNew] = true;
        }
        else
            return Promise.reject(new Error(`the file with name ${fileName} already exists`));

        if (!folder[fileName][isFile])
            return Promise.reject(new Error(`${folder[fileName]} is not a file`));


        return (folder[fileName] as FileSystemFile)[save](cmd.record).then(() =>
        {
            return { recordsAffected: 1 };
        })
    }
}

const fsName = Symbol('name');
const fspath = Symbol('path');
const isDirectory = Symbol('isDirectory');
const model = Symbol('model');
const isFile = Symbol('isFile');
const isNew = Symbol('isNew');
const fileContent = Symbol('fileContent');
const save = Symbol('save');
const load = Symbol('load');
const fileEntryFactoryProperty = Symbol('fileEntryFactory');
const multipleKeySeparatorProperty = Symbol('multipleKeySeparator');

interface PromiseFileSystem
{
    readonly [fsName]: string;
    readonly [fspath]: string;
    [isFile]?: boolean;
    [isDirectory]?: boolean;
    [isNew]?: boolean;
}

interface FileSystemFile extends PromiseFileSystem
{
    [isFile]: true;
    [isDirectory]?: false;
    [fileContent]: any;
    [save](content: any): Promise<void>;
    [load](): Promise<void>;
}

interface FileSystemFolder extends PromiseFileSystem
{
    [isFile]?: false;
    [isDirectory]: true;
    then(onfulfilled?: ((value: PromiseFileSystem) => PromiseFileSystem | PromiseLike<PromiseFileSystem>) | null, onrejected?: ((reason: any) => void) | null): PromiseLike<void | PromiseFileSystem>;
}

interface FileSystemContainer extends PromiseFileSystem
{
    [key: string]: FileSystemEntries;
}

type FileSystemEntries = FileSystemFile | (FileSystemFolder & FileSystemContainer);

function createFolder(path: string, name: string, model: ModelDefinition<any>, fileEntryFactory: (path: string, name: string, def: ModelDefinition<any>) => FileSystemFile, definitions: ModelDefinitions): FileSystemFolder & FileSystemContainer
{
    const folder = new FolderEntry(path, name, model, fileEntryFactory, definitions);
    folder[isNew] = true;
    return new Proxy(folder as any, proxyHandler);
}

// function fsp(path: string)
// {
//     var promise = new Promise<FileSystemFolder & FileSystemContainer>((resolve, reject) =>
//     {
//         fs.readdir(path, { withFileTypes: true }, function (err, result)
//         {
//             if (err)
//                 reject(err);
//             var folder: FileSystemFolder = new FolderEntry(path);
//             result.forEach(e =>
//             {
//                 if (e.isDirectory())
//                     folder[e.name] = new Proxy<FileSystemFolder>(new FolderEntry(path, e.name) as FileSystemFolder, proxyHandler)
//                 else if (e.isFile())
//                     folder[e.name] = new Proxy<FileSystemFile>(new FileEntry(path, e.name), proxyHandler)
//             });


//             resolve(new Proxy<FileSystemFolder>(folder, proxyHandler) as any);
//         })
//     })
//     return promise;
// }
class FolderEntry implements FileSystemFolder, PromiseLike<PromiseFileSystem>
{
    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    [isFile]?: false = false;
    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    [isDirectory]: true = true;
    [fsName]: string;
    [fspath]: string;
    [isNew]?: boolean;
    [model]: ModelDefinition<any>
    [fileEntryFactoryProperty]: (path: string, name: string, def: ModelDefinition<any>) => FileSystemFile;

    constructor(path: string, name: string, def: ModelDefinition<any>, fileEntryFactory: (path: string, name: string, def: ModelDefinition<any>) => FileSystemFile, private modelDefinitions: ModelDefinitions)
    {
        this[fspath] = join(path, name);
        this[fsName] = name;
        this[model] = def;
        if (!def)
            this[isNew] = true;
        Object.defineProperty(this, 'promise', { enumerable: false, writable: true });
        this[fileEntryFactoryProperty] = fileEntryFactory;
    }

    *[Symbol.iterator]()
    {
        for (const key of Object.keys(this))
        {
            if (typeof key == 'symbol')
                continue;
            yield this[key];
        }
    }

    private promise: PromiseLike<FileSystemFolder & FileSystemContainer>;

    then<TResult1 = FileSystemFolder & FileSystemContainer, TResult2 = never>(onfulfilled?: ((value: FileSystemFolder & FileSystemContainer) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>
    {
        if (!this.promise)
        {
            this.promise = new Promise<void>((resolve, reject) =>
            {
                if (this[isNew])
                    fs.mkdir(this[fspath], { recursive: true }, (err) =>
                    {
                        if (err)
                            reject(err);
                        else
                        {
                            this.promise = Promise.resolve(new Proxy(this, {
                                get(target, name)
                                {
                                    if (name == 'then')
                                        return undefined;
                                    return target[name]
                                }
                            })) as any;
                            resolve()
                        }
                    });
                else
                    resolve();
            }).then(() => new Promise((resolve, reject) =>
            {
                fs.readdir(this[fspath], { withFileTypes: true }, (err, result) =>
                {
                    if (err)
                        reject(err);
                    else
                    {
                        result.forEach(e =>
                        {
                            if (e.isDirectory())
                                this[e.name] = new Proxy<FileSystemFolder & FileSystemContainer>(new FolderEntry(this[fspath], e.name, (typeof this[model] == 'undefined') && Object.values(this.modelDefinitions).find(def => def.nameInStorage == e.name), this[fileEntryFactoryProperty], this.modelDefinitions) as any, proxyHandler)
                            else if (e.isFile())
                                this[e.name] = new Proxy<FileSystemFile>(this[fileEntryFactoryProperty](this[fspath], e.name, this[model]), proxyHandler)
                        });
                        resolve(this);
                        this.promise = Promise.resolve(new Proxy(this, {
                            get(target, name)
                            {
                                if (name == 'then')
                                    return undefined;
                                return target[name]
                            }
                        })) as any;
                    }
                })
            }));
        }
        return this.promise.then(onfulfilled, onrejected);

    }
}

export class JsonFileEntry implements FileSystemFile
{
    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    [isFile]: true = true;
    //eslint-disable-next-line @typescript-eslint/prefer-as-const
    [isDirectory]?: false = false;
    [model]: ModelDefinition<any>;
    get [fileContent]() { return fileContents[this[fspath]].lastContent; }
    set [fileContent](value)
    {
        if (fileContents[this[fspath]])
            fileContents[this[fspath]].lastContent = value;
    }
    async [save](modifiedContent: any): Promise<void>
    {
        await writeJson(this[fspath], stringify(this[model], modifiedContent), this[isNew], this[model], this[multipleKeySeparatorProperty]);
        this[isNew] = false;
    }
    [load]()
    {
        return readJson(this[fspath], this[model], this[multipleKeySeparatorProperty]);
    }
    [fsName]: string;
    [fspath]: string;
    [isNew]?: boolean;
    [multipleKeySeparatorProperty]?: string;
    constructor(path: string, name: string, def: ModelDefinition<any>, multipleKeySeparator?: string)
    {
        this[fspath] = join(path, name);
        this[fsName] = name;
        this[model] = def;
        this[multipleKeySeparatorProperty] = multipleKeySeparator;
    }

}

const proxyHandler: ProxyHandler<FileSystemFile | FileSystemFolder> = {
    get(target, name, receiver)
    {
        if (name === 'then')
            if (typeof target[name] == 'function')
                return target[name].bind(target);
            else if (target[isFile])
                return function (onfulfilled, onrejected)
                {
                    return target[load]().then((x) => onfulfilled(x), onrejected);
                }

        if (target[isFile] && typeof name == 'string')
            return target[fileContent][name];
        return Reflect.get(target, name, receiver);
    },
    deleteProperty(target, name)
    {
        if (typeof (name) == 'symbol')
        {
            if (name == fsName)
                throw new Error('name cannot be changed');
            if (name == isDirectory || name == isFile)
                throw new Error('type cannot be changed');
            if (name == fileContent && target[isDirectory])
                throw new Error('cannot set file content on a folder');
            return Reflect.deleteProperty(target, name);
        }
        Reflect.deleteProperty(target, name);
    },
    set(target, name, value)
    {
        if (Reflect.has(target, name))
            return Reflect.set(target, name, value);
        if (typeof (name) == 'symbol')
        {
            if (name == fsName)
                throw new Error('name cannot be changed');
            if (name == isDirectory || name == isFile)
                throw new Error('type cannot be changed');
            if (name == fileContent && target[isDirectory])
                throw new Error('cannot set file content on a folder');
            return Reflect.set(target, name, value);
        }
        if (!value[isFile] && !value[isDirectory])
            throw new Error('value needs to be either a file or a folder');
        if (value[isFile])
        {
            target[name] = value;
            value[isNew] = true;
        }
        if (value[isDirectory])
        {
            target[name] = new Proxy(value, proxyHandler);
            value[isNew] = true;
        }

        return true;
    }
}

const fileContents: { [path: string]: { lastRead: Date, lastContent: any } } = {};

function readJson<T>(path: string, model: ModelDefinition<T>, multipleKeySeparator?: string)
{
    return new Promise<T>((resolve, reject) =>
    {
        fs.lstat(path, function (err, stats)
        {
            if (err)
                reject(err);
            else if (!fileContents[path] || stats.mtime > fileContents[path].lastRead)
            {
                fs.readFile(path, 'utf8', function (err, data)
                {
                    if (err)
                        reject(err);
                    else
                    {
                        fileContents[path] = {
                            lastRead: stats.mtime, lastContent: Object.assign(parse(model, data), parseFileName(model, basename(path), multipleKeySeparator))
                        };
                        resolve(fileContents[path].lastContent);
                    }
                })
            }
            else
                resolve(fileContents[path].lastContent);
        })
    })
}


function writeJson(path: string, json: string, isNew: boolean, model: ModelDefinition<any>, multipleKeySeparator?: string)
{
    return new Promise((resolve, reject) =>
    {
        fs.lstat(path, function (err, stats)
        {
            if (err && !isNew)
                reject(err);
            else if (fileContents[path] && !isNew && stats.mtime > fileContents[path].lastRead)
                throw new Error('the object was modified since the last retrieve');
            else
            {
                fs.writeFile(path, json, 'utf8', function (err)
                {
                    if (err)
                        reject(err);
                    else
                    {
                        fileContents[path] = { lastRead: new Date(), lastContent: Object.assign(parse(model, json), parseFileName(model, basename(path), multipleKeySeparator)) };
                        resolve(fileContents[path].lastContent);
                    }
                })
            }
        })
    })
}

function parse<T>(model: ModelDefinition<T>, json: string): T
{
    const parsedData = JSON.parse(json);
    return Object.fromEntries(model.membersAsArray.map(f => [f['name'] || f.nameInStorage, parsedData[f.nameInStorage]]));
}

function stringify<T>(model: ModelDefinition<T>, json: T): string
{
    return JSON.stringify(Object.fromEntries(model.membersAsArray.map(f => [f.nameInStorage || f['name'], json[f['name']]])));
}

function parseFileName<T>(model: ModelDefinition<T>, fileName: string, multipleKeySeparator?: string): Partial<T>
{
    const record = {};
    model.key.reduce((fileName, key) =>
    {
        if (model.members[key].generator == Generator.uuid || model.members[key].generator == Generator.native)
        {
            const length = crypto.randomUUID().length;
            if (fileName.length > length)
                record[key] = fileName.substring(0, length);
            else
            {
                record[key] = fileName;
                return '';
            }
            if (multipleKeySeparator?.length == 1 && fileName[length] == multipleKeySeparator)
                return fileName.substring(length + 1);
            if (multipleKeySeparator?.length && fileName.substring(length, multipleKeySeparator.length) == multipleKeySeparator)
                return fileName
            throw new Error('invalid file name')
        }
        else if (model.members[key].length)
            record[key] = fileName.substring(0, model.members[key].length)
        else
        {
            record[key] = fileName;
            return '';
        }
        return fileName.substring(record[key].length);
    }, fileName);
    return record;
}
