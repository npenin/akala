import { ExtendedConfigurations, GenericConfiguration } from './metadata/configurations.js';
import { SelfDefinedCommand as ModelCommand } from "./model/command.js";
import { Injectable as baseInjectable } from "@akala/core";
import { Configurations } from './metadata/configurations.js';

type Injectable<T, TArgs extends unknown[]> = baseInjectable<T, TArgs> & { '$inject'?: string[] };

export function inject(...toInject: string[])
{
    return function <TArgs extends unknown[]>(f: Injectable<unknown, TArgs>)
    {
        f['$inject'] = toInject;
        return f;
    }
}

export interface extendF<TConfiguration extends Configurations>
{
    <TArgs extends unknown[]>(cmd: Injectable<unknown, TArgs>, name?: string): ModelCommand<TArgs> & { config: TConfiguration }
    <TArgs extends unknown[], T extends ModelCommand<TArgs>>(cmd: T): T & { config: TConfiguration }
    <TCommand extends ModelCommand<TArgs>, TArgs extends unknown[]>(cmdOrInj: TCommand | Injectable<unknown, TArgs>): (TCommand | ModelCommand<TArgs>) & { config: TConfiguration }
}

export function extend<TConfiguration extends Configurations, TArgs extends unknown[]>(cmd: Injectable<unknown, TArgs>, config: TConfiguration): ModelCommand<TArgs> & { config: TConfiguration }
export function extend<TArgs extends unknown[], T extends ModelCommand<TArgs>, TConfiguration extends Configurations>(cmd: T, config: TConfiguration): T & { config: TConfiguration }
export function extend<TCommand extends ModelCommand<TArgs>, TConfiguration extends Configurations, TArgs extends unknown[]>(cmdOrInj: TCommand | Injectable<unknown, TArgs>, config: TConfiguration): ReturnType<extendF<TConfiguration>>
export function extend<TCommand extends ModelCommand<TArgs>, TConfiguration extends Configurations, TArgs extends unknown[]>(cmdOrInj: TCommand | Injectable<unknown, TArgs>, config: TConfiguration): (TCommand | ModelCommand<TArgs>) & { config: TConfiguration }
{
    let cmd: ModelCommand<TArgs>;
    if (typeof cmdOrInj == 'function')
        cmd = new ModelCommand(cmdOrInj);
    else
        cmd = cmdOrInj;

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
        return function <TCommand extends ModelCommand<TArgs>, TArgs extends unknown[]>(cmd: TCommand | Injectable<unknown, TArgs>)
        {
            return extend(cmd, { [nameOrConfig]: config });
        }
    else
        return function <TCommand extends ModelCommand<TArgs>, TArgs extends unknown[]>(cmd: TCommand | Injectable<unknown, TArgs>)
        {
            return extend(cmd, nameOrConfig);
        }
}