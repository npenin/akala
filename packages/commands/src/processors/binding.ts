import { customResolve, each, ICustomResolver, isPromiseLike, lazy, MiddlewarePromise, NotHandled, Resolvable } from "@akala/core";
import { CommandProcessor, Container, StructuredParameters } from "../index.browser.js";
import { Command } from "../metadata/command.js";
import { Local } from "./local.js";

export class BindingProcessor extends CommandProcessor
{
    constructor()
    {
        super('binding');
    }

    public handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters): MiddlewarePromise
    {
        const bindings = cmd.config?.[param._trigger || ""]?.bindings;
        if (bindings)
        {
            param.bindings = {};
            const lockedParams = { ...param };
            each(bindings, (binding, name) =>
            {
                Object.defineProperty(param.bindings, name, {
                    get: lazy(() =>
                    {
                        return Local.execute({
                            name: cmd.name, config: {
                                "": {
                                    inject: [
                                        binding.source,
                                        binding.where
                                    ]
                                }
                            }
                        }, (source: ICustomResolver, where: Resolvable | Promise<Resolvable>) =>
                        {
                            if (isPromiseLike(where))
                                return where.then(where => source[customResolve](where));
                            return source[customResolve](where)
                        }, origin, lockedParams);
                    })

                })
            });
        }

        return NotHandled;
    }

}
