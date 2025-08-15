import { ErrorWithStatus } from "@akala/core";
import { type SocketAdapter } from "@akala/core";
import { randomUUID } from "crypto";
import type State from "../state.js";

export default async function (this: State, name: string, socket: SocketAdapter)
{
    var cp = this.processes[name];
    if (!cp)
        throw new ErrorWithStatus(404, `There is no such process with name ${name}`);
    const connectionId = randomUUID();
    this.bridges[connectionId] = { left: socket };
    await cp.dispatch('$bridge', connectionId);
    return new Promise<void>((resolve) =>
    {
        const x = setInterval(() =>
        {
            if (this.bridges[connectionId].right)
            {
                clearInterval(x);
                resolve();
            }
        }, 100)
    });
}
