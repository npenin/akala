import * as cp from 'child_process'
import { platform } from "os";
import * as fslib from '@yarnpkg/fslib'
import EssentialPlugin from '@yarnpkg/plugin-essentials';
import yarn from '@yarnpkg/cli';
import clipanion from 'clipanion'

export default
    {
        async install(packageName: string, path: string)
        {
            var cli = clipanion.Cli.from(EssentialPlugin.commands)
            await cli.run(['add', packageName], { ...clipanion.Cli.defaultContext, cwd: fslib.npath.toPortablePath(path), quiet: false, plugins: yarn.getPluginConfiguration() });
        },
        async update(packageName: string, path: string)
        {
            var cli = clipanion.Cli.from(EssentialPlugin.commands)
            await cli.run(['up', packageName], { ...clipanion.Cli.defaultContext, cwd: fslib.npath.toPortablePath(path), quiet: false, plugins: yarn.getPluginConfiguration() });
        },
        async link(packageName: string, path: string)
        {
            var cli = clipanion.Cli.from(EssentialPlugin.commands)
            await cli.run(['link', packageName], { ...clipanion.Cli.defaultContext, cwd: fslib.npath.toPortablePath(process.cwd()), quiet: false, plugins: yarn.getPluginConfiguration() });
        }
    }