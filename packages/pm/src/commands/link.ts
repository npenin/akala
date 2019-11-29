import State from "../state";
import * as cp from 'child_process'
import { platform } from "os";
import { join } from "path";
import { existsSync } from "fs";
import { description } from "../container";
import npmHelper from "../npm-helper";

export default async function link(this: State, packageName: string, folder: string, pm: description.pm)
{
    var path = folder || this.config.containers['pm'][0];
    await npmHelper.link(packageName, path);

    return pm.dispatch('discover', packageName, folder)
};

exports.default.$inject = ['param.0', 'param.1', 'container']
