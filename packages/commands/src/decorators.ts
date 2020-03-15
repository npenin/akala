import { Command } from "./model/command";
import { Injectable as baseInjectable } from "@akala/core";
import { Configuration, Configurations } from "./metadata";
import * as akala from '@akala/core'

type Injectable<T> = baseInjectable<any> & { '$inject'?: string[] };

export function inject(...toInject: string[])
{
    return function (f: Injectable<any> & { '$inject'?: string[] })
    {
        f['$inject'] = toInject;
        return f;
    }
}

export function configure<T extends Configuration, TKey extends string = string>(name: TKey, config: T): (cmd: Command<any> | Injectable<any>) => Command<any> & { config: { [k in TKey]: T } }
export function configure(config: Configurations): (cmd: Command<any> | Injectable<any>) => Command<any> & { config: Configurations }
export function configure(name: Configurations | string, config?: any): (cmd: Command<any> | Injectable<any>) => Command<any>
{
    if (typeof name == 'string')
        config = { [name]: config };
    else
        config = name;
    return function (cmd: Command<any> | baseInjectable<any>): Command<any>
    {
        if (typeof cmd == 'function')
            cmd = new Command<any>(cmd);

        akala.extend(cmd.config, config)


        if (cmd.config[''])
            cmd.inject = cmd.config[''].inject;

        return cmd;
    }
}