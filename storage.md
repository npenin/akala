# Storage

Storage is one of the most complex layer. It allows you to store data virtually whereever you want. Initially originating from an old project I have been working on (EUSS) in .NET. This implementation in typescript provides much more flexibility, and is updated to nowadays requirements with async model support.

## Stores

If you are familiar with EntityFramework in .NET, Storage uses a similar concept provide an interface to load and store data.

```ts
if (category)
        return await store.Devices.where('category', db.expressions.BinaryOperator.Equal, category)
            .select({ name: 'name', length: 'commands && commands.length + subdevices && subdevices.length' }).toArray();
    else
        return await store.Devices
            .groupBy('category').select({ name: 'key', length: 'value.length' }).toArray();
```

## Providers

### Vanilla

Vanilla is the most simple storage provider. It takes the objects as given and stores them in memory.

### File
 
File is currently the only other provider and allows storing objects on the file system. You can obviously configure the root folder. In the root folder, there will be 1 folder for the namespace and 1 for the model name


## Models

Storage allows you to define your model and provide full typing support. 
You may define your models with 2 different flavors:
- with decorators
```ts
import * as db from '../server'
import 'reflect-metadata'

@db.Model
export class ModelTest1
{
    constructor() { }

    @db.Key(db.Types.string)
    public s1: string;

    private _s2: string;
    public get s2(): string
    {
        return this._s2;
    }
    @db.Field
    public set s2(v: string)
    {
        this._s2 = v;
    }

    @db.Field
    public d: Date;
}
```
- with imperative programmation
```ts
    var devices = new ModelDefinition<devices.IDevice>('Devices', 'devices', 'devices');
    devices.defineMember('name', true, Types.string(50), Generator.business);
    devices.defineMember('category', false, Types.string(50));
    devices.defineMember('type', false, Types.string(50));
```
