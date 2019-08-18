import { Command } from "./command";
import { Injectable as baseInjectable } from "@akala/core";

type Injectable<T> = baseInjectable<any> & { '$inject'?: string[] };

export function inject(toInject: string[])
{
    return function (f: Injectable<any> & { '$inject'?: string[] })
    {
        f['$inject'] = toInject;
    }
}

export function triggerredBy(name: string, config: any): (cmd: Command<any> | Injectable<any>) => Command<any>
export function triggerredBy(config: { [name: string]: any }): (cmd: Command<any> | Injectable<any>) => Command<any>
export function triggerredBy(name: { [name: string]: any } | string, config?: any): (cmd: Command<any> | Injectable<any>) => Command<any>
{
    if (typeof name == 'string')
        config = { [name]: config };
    else
        config = name;
    return function (cmd: Command<any> | baseInjectable<any>): Command<any>
    {
        if (typeof cmd == 'function')
            cmd = new Command<any>(cmd);

        Object.assign({}, config, cmd.triggers);

        return cmd;
    }
}