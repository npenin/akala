import * as fs from 'fs';

export async function updateConfig(newConfig: unknown, key: string): Promise<void>
{
    const config = await getConfig();
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
    }, config);
    writeConfig(config);
}

export function writeConfig(config: unknown): Promise<void>
{
    return fs.promises.writeFile('./config.json', JSON.stringify(config, null, 4), 'utf8').catch(function (err)
    {
        if (err)
            console.error(err);
    });
}

export function getConfig<T = unknown>(): Promise<T>
{
    return fs.promises.readFile('./config.json', 'utf8').then(function (content)
    {
        return JSON.parse(content);
    }, function ()
    {
        writeConfig({}).then(function ()
        {
            return {};
        })
    });
}