import { defaultInjector, ErrorWithStatus, HttpStatusCode, Resolvable, SimpleInjector } from "@akala/core";
import { providers } from "./shared.js";

class DataInjector extends SimpleInjector
{
    constructor(connectionStrings: Record<string, URL> = {})
    {
        super(null);
        if (connectionStrings)
            this.setInjectables(connectionStrings);
    }

    resolve<T>(param: Resolvable): T
    {
        switch (typeof param)
        {
            case "string":
                if (URL.canParse(param))
                    return providers.process(new URL(param)) as T;
                else if (param in this.injectables)
                    return providers.process(new URL(this.injectables[param])) as T;
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Malformed URL or non registered connection url:' + param?.toString())
            case "number":
            case "bigint":
            case "boolean":
            case "symbol":
            case "undefined":
            case "object":
            case "function":
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Malformed URL :' + param?.toString())
        }
    }
}

export default function (config: { storage: Record<string, string> })
{
    defaultInjector.register('data', new DataInjector(Object.fromEntries(Object.entries(config.storage).map(e => [e[0], new URL(e[1])] as const))))
}
