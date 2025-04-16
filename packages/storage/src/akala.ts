import { defaultInjector, ErrorWithStatus, HttpStatusCode, Injector, Resolvable } from "@akala/core";
import { providers } from "./shared.js";

class DataInjector extends Injector
{
    constructor(private readonly connectionStrings: Record<string, URL> = {})
    {
        super();
    }

    onResolve<T = unknown>(name: Resolvable): PromiseLike<T>;
    onResolve<T = unknown>(name: Resolvable, handler: (value: T) => void): void;
    onResolve<T>(name: unknown, handler?: unknown): void | PromiseLike<T>
    {
        throw new Error("Method not implemented.");
    }
    resolve<T>(param: Resolvable): T
    {
        switch (typeof param)
        {
            case "string":
                if (URL.canParse(param))
                    return providers.process(new URL(param)) as T;
                else if (param in this.connectionStrings)
                    return providers.process(new URL(this.connectionStrings[param])) as T;
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
    inspect(): void
    {
    }

    register(name: string, connectionString: URL)
    {
        this.connectionStrings[name] = connectionString;
    }

}

export default function (config: { storage: Record<string, string> })
{
    defaultInjector.register('data', new DataInjector(Object.fromEntries(Object.entries(config.storage).map(e => [e[0], new URL(e[1])] as const))))
}
