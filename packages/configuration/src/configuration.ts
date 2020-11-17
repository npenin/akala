import fs from 'fs/promises'

export class Configuration
{
    constructor(private path: string, private config: any = {})
    {

    }

    public static async load(file: string)
    {
        try
        {
            var content = await fs.readFile(file, 'utf8');
            return new Configuration(file, JSON.parse(content));
        }
        catch (e)
        {
            console.error(e);
            return undefined;
        }
    }

    public get(key?: string)
    {
        if (key)
        {
            return key.split('.').reduce(function (config, key)
            {
                return config[key];
            }, this.config)
        }
        else
            return this.config;
    }

    public set(key: string, newConfig: any)
    {
        var keys = key.split('.');
        keys.reduce(function (config, key, i)
        {
            if (keys.length == i + 1)
            {
                config[key] = newConfig;
                console.log(config);
            }
            else if (typeof (config[key]) == 'undefined')
                config[key] = {};

            return config[key];
        }, this);
    }

    public async commit(file?: string, formatted?: boolean)
    {
        return fs.writeFile(file || this.path, JSON.stringify(this, null, formatted && 4 || undefined), 'utf8');
    }
}