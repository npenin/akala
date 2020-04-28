import { Command, jsonObject } from "./metadata/command";
import { Command as ModelCommand } from "./model/command";
import { Injectable as baseInjectable } from "@akala/core";
import { Configuration, Configurations } from "./metadata";
import * as akala from '@akala/core'

type Injectable<T> = baseInjectable<T> & { '$inject'?: string[] };

export function inject(...toInject: string[])
{
    return function (f: Injectable<any>)
    {
        f['$inject'] = toInject;
        return f;
    }
}

export interface extendF<TConfiguration extends { [key: string]: (jsonObject & Configuration) | undefined }>
{
    (cmd: Injectable<any>): ModelCommand & { config: TConfiguration }
    <T extends Command>(cmd: T): T & { config: TConfiguration }
    <TCommand extends Command>(cmdOrInj: TCommand | Injectable<any>): (TCommand | ModelCommand) & { config: TConfiguration }

}

export function extend<TConfiguration extends { [key: string]: Configuration }>(cmd: Injectable<any>, config: TConfiguration): ModelCommand & { config: TConfiguration }
export function extend<T extends Command, TConfiguration extends { [key: string]: Configuration }>(cmd: T, config: { [key: string]: Configuration }): T & { config: TConfiguration }
export function extend<TCommand extends Command, TConfiguration extends { [key: string]: Configuration }>(cmdOrInj: TCommand | Injectable<any>, config: { [key: string]: Configuration }): (TCommand | ModelCommand) & { config: TConfiguration }
export function extend<TCommand extends Command, TConfiguration extends { [key: string]: Configuration }>(cmdOrInj: TCommand | Injectable<any>, config: { [key: string]: Configuration }): (TCommand | ModelCommand) & { config: TConfiguration }
{
    var cmd: Command;
    if (typeof cmdOrInj == 'function')
        cmd = new ModelCommand(cmdOrInj);
    else
        cmd = cmdOrInj as Command;

    akala.extend(cmd.config, config)


    if (cmd.config[''])
        cmd.inject = cmd.config[''].inject;

    return cmd as TCommand & { config: TConfiguration };
}

export function configure<T extends Configuration, TKey extends string>(name: TKey, config: T): extendF<{ [name in TKey]: T & jsonObject }>
export function configure<T extends Configurations>(config: T): extendF<T>
export function configure(name: Configurations | string, config?: any)
{
    if (typeof name == 'string')
        config = { [name]: config };
    else
        config = name;
    return function <TCommand extends Command>(cmd: TCommand | Injectable<any>)
    {
        return extend<TCommand, { [key: string]: Configuration }>(cmd, config);
    }
}