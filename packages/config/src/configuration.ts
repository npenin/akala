import fs from 'fs/promises'

export class Configuration
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private path: string, private config: any = {})
    {

    }

    public static async load(file: string): Promise<Configuration>
    {
        try
        {
            const content = await fs.readFile(file, 'utf8');
            return new Configuration(file, JSON.parse(content));
        }
        catch (e)
        {
            console.error(e);
            return undefined;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public get<T = any>(key?: string): T
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

    public set<T>(key: string, newConfig: T): void
    {
        const keys = key.split('.');
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

    public async commit(file?: string, formatted?: boolean): Promise<void>
    {
        return fs.writeFile(file || this.path, JSON.stringify(this, null, formatted && 4 || undefined), 'utf8');
    }
}