import State, { RunningContainer } from '../state'
import { homedir } from 'os';
import fs from 'fs/promises';
import { join } from 'path';
import { description } from '../container';
import serve from '@akala/commands/dist/cli/serve';
import { Container, ServeOptions, Command, Metadata, ignoredCommands, configure } from '@akala/commands';
import { eachAsync } from '@akala/core';
import { Configurations } from '@akala/commands/dist/metadata';

export async function metadata(container: Container<any>, deep?: boolean)
{
    var metacontainer: Metadata.Container = { name: container.name || 'unnamed', commands: [] };
    await eachAsync(container.keys(), async key =>
    {
        if (key === '$injector' || key === '$state' || key === '$container' || ignoredCommands.indexOf(key) > -1 || key == '$init' || key == '$stop')
            return;
        var cmd = container.resolve<Command>(key);
        if (cmd && cmd.name && cmd instanceof Command && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject || [], config: cmd.config });
        // console.log(deep)
        if (cmd instanceof Container && deep)
        {
            let subContainer: Metadata.Container = await cmd.dispatch('$metadata', deep);
            // console.log(subContainer);
            subContainer.commands.forEach(c => c.name = key + '.' + c.name)
            metacontainer.commands.push(...subContainer.commands.filter(c => c.name !== key + '.$init' && c.name !== key + '.$stop'));
        }
    });
    return metacontainer;
}

export default async function (this: State, container: RunningContainer<State> & description.pm, options: ServeOptions)
{
    this.isDaemon = true;
    this.processes = [];
    var configPath = join(homedir(), './.pm.config.json');
    try
    {
        this.config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
        process.chdir(this.config.containers.pm[0]);
    }
    catch (e)
    {
        if (e.code === 'ENOENT')
            this.config = {
                containers: { pm: [process.cwd()] },
                mapping: {}
            } as any;
        else
            throw e;
    }

    this.config.save = function ()
    {
        return fs.writeFile(configPath, JSON.stringify(this, null, 4), 'utf-8').then(() => console.log('config saved'))
    }

    if (!this.config.externals)
        this.config.externals = [];

    await this.config.save();
    container.name = 'pm';
    await container.dispatch('map', 'pm', join(__dirname, '../../commands.json'), true);
    var config = container.resolve<Configurations>('$metadata.config');
    container.unregister('$metadata');
    container.register(configure(config)(new Command(metadata, '$metadata', ['$container', 'param.0'])));


    this.processes.push(container);
    container.running = true;

    try
    {
        await fs.unlink('./pm.sock')
    }
    catch (e)
    {

    }

    var stop = await serve(container as Container<any>, options || { _: ['local'] });
    process.on('SIGINT', stop);

    if (process.disconnect)
    {
        if (process.send)
            process.send('disconnecting daemon');
        process.disconnect();
    }
}

exports.default.$inject = ['$container', 'options'];