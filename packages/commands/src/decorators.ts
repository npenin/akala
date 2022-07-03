import { jsonObject, ExtendedConfigurations, GenericConfiguration } from './metadata/command';
import { SelfDefinedCommand as ModelCommand } from "./model/command.js";
import { Injectable as baseInjectable } from "@akala/core";
import { Configuration, Configurations } from './metadata/index';

type Injectable<T> = baseInjectable<T> & { '$inject'?: string[] };

export function inject(...toInject: string[])
{
    return function (f: Injectable<unknown>)
    {
        f['$inject'] = toInject;
        return f;
    }
}

export interface extendF<TConfiguration extends { [key: string]: (jsonObject & Configuration) | undefined }>
{
    (cmd: Injectable<unknown>, name?: string): ModelCommand & { config: TConfiguration }
    <T extends ModelCommand>(cmd: T): T & { config: TConfiguration }
    <TCommand extends ModelCommand>(cmdOrInj: TCommand | Injectable<unknown>): (TCommand | ModelCommand) & { config: TConfiguration }
}

export function extend<TConfiguration extends Configurations>(cmd: Injectable<unknown>, config: TConfiguration): ModelCommand & { config: TConfiguration }
export function extend<T extends ModelCommand, TConfiguration extends Configurations>(cmd: T, config: TConfiguration): T & { config: TConfiguration }
export function extend<TCommand extends ModelCommand, TConfiguration extends Configurations>(cmdOrInj: TCommand | Injectable<unknown>, config: TConfiguration): ReturnType<extendF<TConfiguration>>
export function extend<TCommand extends ModelCommand, TConfiguration extends Configurations>(cmdOrInj: TCommand | Injectable<unknown>, config: TConfiguration): (TCommand | ModelCommand) & { config: TConfiguration }
{
    let cmd: ModelCommand;
    if (typeof cmdOrInj == 'function')
        cmd = new ModelCommand(cmdOrInj);
    else
        cmd = cmdOrInj as ModelCommand;

    Object.assign(cmd.config, config)

    if (cmd.config[''])
        cmd.inject = cmd.config[''].inject;

    return cmd as TCommand & { config: TConfiguration };
}

export function configure<T extends GenericConfiguration, TKey extends string>(name: TKey, config: T): extendF<ExtendedConfigurations<T, TKey>>
export function configure<T extends Configurations>(config: T): extendF<T>
export function configure<T extends Configurations>(nameOrConfig: T | string, config?: GenericConfiguration): extendF<Configurations>
{
    if (typeof nameOrConfig == 'string')
        return function <TCommand extends ModelCommand>(cmd: TCommand | Injectable<unknown>)
        {
            return extend(cmd, { [nameOrConfig]: config });
        }
    else
        return function <TCommand extends ModelCommand>(cmd: TCommand | Injectable<unknown>)
        {
            return extend(cmd, nameOrConfig);
        }
}