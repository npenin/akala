import * as cp from 'child_process'
import { platform } from "os";
import * as fslib from '@yarnpkg/fslib'
import EssentialPlugin from '@yarnpkg/plugin-essentials';
import { getPluginConfiguration } from '@yarnpkg/cli';
import { Cli } from 'clipanion'

export default
    {
        async install(packageName: string, path: string)
        {
            var cli = Cli.from(EssentialPlugin.commands)
            await cli.run(['add', packageName], { ...Cli.defaultContext, cwd: fslib.npath.toPortablePath(path), quiet: false, plugins: getPluginConfiguration() });
        },
        async update(packageName: string, path: string)
        {
            var cli = Cli.from(EssentialPlugin.commands)
            await cli.run(['up', packageName], { ...Cli.defaultContext, cwd: fslib.npath.toPortablePath(path), quiet: false, plugins: getPluginConfiguration() });
        },
        async link(packageName: string, path: string)
        {
            var cli = Cli.from(EssentialPlugin.commands)
            await cli.run(['link', packageName], { ...Cli.defaultContext, cwd: fslib.npath.toPortablePath(process.cwd()), quiet: false, plugins: getPluginConfiguration() });
        }
    }