import program from '../router';
import * as fs from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import { write } from 'fs/promises';
import * as akala from '@akala/core'

async function updateConfig(newConfig, key)
{
    var config = await getConfig();
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
    }, config);
    writeConfig(config);
}

akala.register('$updateConfig', updateConfig);
akala.registerFactory('$config', getConfig);

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
    }, function (err)
        {
            writeConfig({}).then(function (config)
            {
                return {};
            })
        });
}

var config = program.command('config');
config.command('set <key> [value]')
    .action(async function (context, next)
    {
        await updateConfig(context.params.value, context.params.key)
    });

config.command('get [key]')
    .action(async function (context, next)
    {
        var config = await getConfig()
        if (context.params.key)
        {
            console.log(context.params.key.split('.').reduce(function (config, key)
            {
                return config[key];
            }, config))
        }
        else
            console.log(JSON.stringify(config, null, 4));
    });