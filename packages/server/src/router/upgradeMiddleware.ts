import { MiddlewareAsync, MiddlewarePromise, NotHandled } from "@akala/core";
import { Request } from './shared.js'
import { Socket } from "net";

export class UpgradeMiddleware implements MiddlewareAsync<[Request, Socket, Buffer]>
{
    private readonly handler: (args_0: Request, args_1: Socket, args_2: Buffer) => void;
    public readonly upgradeSupport: string;

    constructor(upgradeSupport: string, handler: (...args: [Request, Socket, Buffer]) => void)
    {
        this.upgradeSupport = upgradeSupport || 'websocket';
        this.handler = handler;
    }

    handle(req: Request, res: Socket, head?: Buffer): MiddlewarePromise
    {
        if (req.method && req.method.toLowerCase() == 'upgrade')
        {

            if (req.headers['connection'].toLowerCase() == 'upgrade' && req.headers['upgrade'].toLowerCase() == this.upgradeSupport)
            {
                try
                {
                    this.handler(req, res, head);
                    return Promise.reject();
                }
                catch (e)
                {
                    return Promise.resolve(e);
                }
            }
        }
        return NotHandled;
    }
}
