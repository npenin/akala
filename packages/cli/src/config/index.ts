import program from '../router/index.js';
import * as fs from 'fs';
import { promisify } from 'util';
import * as akala from '@akala/core'

async function updateConfig(newConfig, key)
{
    const config = await getConfig();
    const keys = key.split('.');
    keys.reduce(function (config, key, i)
    {
        if (keys.length == i + 1)
        {
            config[key] = newConfig;
            // console.log(config);
        }
        else if (typeof (config[key]) == 'undefined')
            config[key] = {};

        return config[key];
    }, config);
    writeConfig(config);
}


var updateConfigGetter = {
    get: function (updateConfig, key)
    {
        return new Proxy(function (newConfig, subKey)
        {
            return updateConfig(newConfig, key + '.' + subKey);
        }, updateConfigGetter);
    }
}

var getConfigGetter = {
    get: function (getConfig: typeof getConfigWithKey, key: string)
    {
        return new Proxy(function (subKey?: string)
        {
            if (subKey)
                return getConfig(key + '.' + subKey);
            return getConfig(key);
        }, getConfigGetter);
    }
}

async function getConfigWithKey(key?: string)
{
    const config = await getConfig()
    if (key)
    {
        return key.split('.').reduce(function (config, key)
        {
            return config[key];
        }, config)
    }
    else
        return config;
}

const getConfigProxy = new Proxy(getConfigWithKey, getConfigGetter);

export function init(): void
{

    akala.defaultInjector.register('$updateConfig', akala.chain(updateConfig, function (keys, config, key)
    {
        if (key)
        {
            keys.push(key);
        }
        return [config, keys.join('.')];
    }));
    akala.defaultInjector.register('$getConfig', akala.chain(getConfig, function (keys, key)
    {
        if (key)
        {
            keys.push(key);
        }
        return [keys.join('.')];
    }));

    akala.defaultInjector.registerFactory('$config', getConfigProxy);
}

init();

function writeConfig(config)
{
    return promisify(fs.writeFile)('./config.json', JSON.stringify(config, null, 4), 'utf8').catch(function (err)
    {
        if (err)
            console.error(err);
    });
}

function getConfig()
{
    return promisify(fs.readFile)('./config.json', 'utf8').then(function (content)
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

const config = program.command('config');
config.command('set <key> [value]')
    .action(async function (context)
    {
        await updateConfig(context.options.value, context.options.key)
    });

config.command('get [key]')
    .action(function (context)
    {
        return akala.defaultInjector.resolve<typeof getConfigWithKey>('$getConfig')(context.options.key as string);
    });