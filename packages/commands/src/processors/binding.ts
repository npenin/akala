import { customResolve, each, ICustomResolver, lazy, MiddlewarePromise, NotHandled, Resolvable } from "@akala/core";
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
        if (cmd.config?.bindings)
        {
            param.bindings = {};
            const lockedParams = { ...param };
            each(cmd.config.bindings, (binding, name) =>
            {
                Object.defineProperty(param.binding, name, {
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
                        }, (source: ICustomResolver, where: Resolvable) =>
                        {
                            return source[customResolve](where)
                        }, origin, lockedParams);
                    })

                })
            });
        }

        return NotHandled;
    }

}
