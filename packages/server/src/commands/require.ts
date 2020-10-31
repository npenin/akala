import { State } from "../state";
import * as path from 'path'
import * as akala from '@akala/core'

export default function requireCmd(this: State, injector: akala.Injector, target: string, cwd: string)
{
    // console.log(arguments);

    if (target && !path.isAbsolute(target))
        target = path.resolve(cwd, target);

    var remoteObj: akala.Injectable<any> = require(target).default;
    injector.inject(remoteObj)(this);
}