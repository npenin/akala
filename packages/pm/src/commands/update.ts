import State from "../state";
import * as cp from 'child_process'
import { platform } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { description } from "../container";
import { Transform, PassThrough } from "stream";
import npmHelper from "../npm-helper";
import discover from './discover'



export default async function update(this: State, packageName: string, folder: string, pm: description.pm): Promise<string>
{
    var version = await pm.dispatch('version', packageName, folder);

    var path = folder || this.config.containers['pm'][0];
    await npmHelper.update(packageName, path);

    await pm.dispatch('discover', packageName, folder)

    return 'updated from ' + version + ' to ' + await pm.dispatch('version', packageName, folder);
};

exports.default.$inject = ['param.0', 'param.1', 'container']
