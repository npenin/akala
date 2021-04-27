import { PersistenceEngine, dynamicProxy } from '../PersistenceEngine.js';
import { StrictExpressions } from '../expressions/expression.js';
import { ExpressionExecutor } from '../expression-executor.js';
import * as fs from "fs";
import { join } from "path";
import { CommandProcessor } from '../commands/command-processor.js';
import { CommandResult, Commands, Create } from '../commands/command.js';
import { ModelDefinition } from '../shared.js';
import { promisify } from "util";
import { ConstantExpression } from '../expressions/constant-expression.js';
import { Generator } from '../common.js';
import { v4 as uuid } from 'uuid'
import { NotSupportedException } from '../exceptions.js';


export class File extends PersistenceEngine<FileOptions>
{
    private store: FileSystemFolder & FileSystemContainer;

    constructor()
    {
        super(new FileCommandProcessor());
    }

    public async init(options?)
    {
        if (!options)
            options = { path: process.cwd(), rootDbName: '.' };
        if (!options.store)
            options.store = await new FolderEntry(options.path, options.rootDbName, undefined);
        this.store = options.store;
        this.processor.init(options);
    }

    public static async from(path: string, rootDbName: string = '.')
    {
        var engine = new File();
        await engine.init({ path, rootDbName });
        return engine;
    }

    public async load<T>(expression: StrictExpressions): Promise<T>
    {
        var executor = new ExpressionExecutor();
        var visitConstant = executor.visitConstant;
        var store = this.store;
        executor.visitConstant = async function <TCte>(this: ExpressionExecutor, cte: ConstantExpression<TCte>)
        {
            if (cte.value instanceof ModelDefinition)
            {
                var folder = await Promise.resolve<FileSystemEntries>(store);
                folder = await store[cte.value.namespace || 'db']
                if (!folder)
                {
                    folder = new Proxy(new FolderEntry(store[fspath], cte.value.namespace || 'db', null) as any, proxyHandler);
                    folder[isNew] = true;
                }
                if (folder[isFile])
                    throw new Error(`found file ${cte.value.namespace || 'db'} while expecting a folder in ${store[fspath]}`);

                if (!folder[cte.value.nameInStorage])
                {
                    folder = new Proxy(new FolderEntry(folder[fspath], cte.value.nameInStorage, cte.value) as any, proxyHandler);
                    folder[isNew] = true;
                }
                else
                    folder = await folder[cte.value.nameInStorage];
                if (folder[isFile])
                    throw new Error(`found file ${cte.value.nameInStorage} while expecting a folder in ${store[fspath]}`);

                this.result = folder;
                this.model = cte.value;
            }
            else
                return visitConstant.call(this, cte);
        }
        return await executor.visit(expression).then(() =>
        {
            if (typeof executor.result == 'object' && executor.model)
                if (Reflect.has(executor.result, Symbol.iterator) || Reflect.has(executor.result, Symbol.asyncIterator))
                    return this.dynamicProxy(executor.result, executor.model) as any;
                else
                    return dynamicProxy<T>(executor.result, executor.model);
            else
                return executor.result;

        });
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
    constructor()
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
        var fileName = '';
        for (var key of model.key)
        {
            if (fileName)
                fileName += this.engineOptions.multipleKeySeparator || '-'
            if (model.members[key].generator == Generator.uuid || model.members[key].generator == Generator.native)
                record[key] = uuid();
            fileName += await record[key];
        }
        if (fileName == 'then')
            throw new NotSupportedException('the file trying to be saved would result in a name as `then`. This conflicts with the promiselike understanding.');
        return fileName;
    }

    async visitUpdate<T>(cmd: Commands<T>): Promise<CommandResult>
    {
        var folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder || !folder[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`));
        folder = await folder[cmd.model.nameInStorage]
        if (!folder || !folder[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`));
        var fileName = await this.getFileName(cmd.record, cmd.model);
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
        var folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder || !folder[isDirectory])
            throw new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`);
        if (folder[isNew] && folder[isDirectory])
            await folder
        folder = await folder[cmd.model.nameInStorage]
        if (!folder || !folder[isDirectory])
            throw new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`);
        var fileName = await this.getFileName(cmd.record, cmd.model);
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
        var folder = await this.store[cmd.model.namespace || 'db'];
        if (!folder)
            folder = await (this.store[cmd.model.namespace || 'db'] = createFolder(this.store[fspath], cmd.model.namespace || 'db', null));
        if (!folder || !folder[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db')} is not a folder`));

        if (!await folder[cmd.model.nameInStorage])
            folder[cmd.model.nameInStorage] = createFolder(folder[fspath], cmd.model.nameInStorage, cmd.model);
        folder = await folder[cmd.model.nameInStorage]
        if (!folder || !folder[isDirectory])
            return Promise.reject(new Error(`the path ${join(this.store[fsName], cmd.model.namespace || 'db', cmd.model.nameInStorage)} is not a folder`));

        var fileName = await this.getFileName(cmd.record, cmd.model);

        if (!folder[fileName])
        {
            folder[fileName] = new Proxy(new FileEntry(folder[fspath], fileName, cmd.model), proxyHandler);
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

function createFolder(path: string, name: string, model: ModelDefinition<any>): FileSystemFolder & FileSystemContainer
{
    var folder = new FolderEntry(path, name, model);
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
    [isFile]?: false = false;
    [isDirectory]: true = true;
    [fsName]: string;
    [fspath]: string;
    [isNew]?: boolean;
    [model]: ModelDefinition<any>
    constructor(path: string, name: string, def: ModelDefinition<any>)
    {
        this[fspath] = join(path, name);
        this[fsName] = name;
        this[model] = def;
        Object.defineProperty(this, 'promise', { enumerable: false, writable: true });
    }

    *[Symbol.iterator]()
    {
        for (var key of Object.keys(this))
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
            if (this[isNew])
            {
                this.promise = new Promise<FileSystemFolder & FileSystemContainer>((resolve, reject) =>
                {
                    fs.mkdir(this[fspath], (err) =>
                    {
                        if (err)
                            reject(err);
                        else
                        {
                            resolve(this)
                            this.promise = Promise.resolve(new Proxy(this, {
                                get(target, name)
                                {
                                    if (name == 'then')
                                        return undefined;
                                    return target[name]
                                }
                            }));
                        }
                    });
                })
            }
            else
                this.promise = new Promise((resolve, reject) =>
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
                                    this[e.name] = new Proxy<FileSystemFolder & FileSystemContainer>(new FolderEntry(this[fspath], e.name, typeof this[model] == 'undefined' && null || ModelDefinition.definitionsAsArray.find(def => def.nameInStorage == e.name)) as any, proxyHandler)
                                else if (e.isFile())
                                    this[e.name] = new Proxy<FileSystemFile>(new FileEntry(this[fspath], e.name, this[model]), proxyHandler)
                            });
                            resolve(this);
                            this.promise = Promise.resolve(new Proxy(this, {
                                get(target, name)
                                {
                                    if (name == 'then')
                                        return undefined;
                                    return target[name]
                                }
                            }));
                        }
                    })
                })
        }
        return this.promise.then(onfulfilled, onrejected);

    }
}

class FileEntry implements FileSystemFile
{
    [isFile]: true = true;
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
        await writeJson(this[fspath], JSON.stringify(modifiedContent), this[isNew], this[model]);
        this[isNew] = false;
    }
    [load]()
    {
        return readJson(this[fspath], this[model]);
    }
    [fsName]: string;
    [fspath]: string;
    [isNew]?: boolean;
    constructor(path: string, name: string, def: ModelDefinition<any>)
    {
        this[fspath] = join(path, name);
        this[fsName] = name;
        this[model] = def;
    }

}

var proxyHandler: ProxyHandler<FileSystemEntries> = {
    get(target, name, receiver)
    {
        if (name === 'then')
            if (typeof target[name] == 'function')
                return target[name].bind(target);
            else if (target[isFile])
                return function (onfulfilled, onrejected)
                {
                    return target[load]().then(onfulfilled, onrejected);
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

var fileContents: { [path: string]: { lastRead: Date, lastContent: any } } = {};

function readJson<T>(path: string, model: ModelDefinition<T>)
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
                            lastRead: stats.mtime, lastContent: model.fromJson(data)
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


function writeJson(path: string, json: string, isNew: boolean, model: ModelDefinition<any>)
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
                        fileContents[path] = { lastRead: new Date(), lastContent: model.fromJson(json) };
                        resolve(fileContents[path].lastContent);
                    }
                })
            }
        })
    })
}