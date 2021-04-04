import { State } from "../state";
import * as path from 'path'
import * as akala from '@akala/core'

export default function requireCmd(this: State, injector: akala.Injector, target: string, cwd: string): unknown
{
    // console.log(arguments);

    if (target && !path.isAbsolute(target))
        target = path.resolve(cwd, target);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const remoteObj: akala.Injectable<unknown> = require(target).default;
    return injector.inject(remoteObj)(this);
}