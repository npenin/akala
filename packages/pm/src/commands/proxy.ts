import { ErrorWithStatus } from "@akala/core";
import { SocketAdapter } from "@akala/json-rpc-ws";
import { randomUUID } from "crypto";
import State from "../state";

export default async function (this: State, name: string, socket: SocketAdapter)
{
    var cp = this.processes[name];
    if (!cp)
        throw new ErrorWithStatus(404, `There is no such process with name ${name}`);
    const connectionId = randomUUID();
    this.bridges[connectionId] = { left: socket };
    cp.dispatch('$bridge', connectionId);
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