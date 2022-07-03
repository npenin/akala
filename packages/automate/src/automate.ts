import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, SpawnOptionsWithoutStdio } from 'child_process';
import commands from './container';
import { Interpolate, mapAsync, Middleware, MiddlewareCompositeWithPriority, Parser, AggregateErrors, MiddlewarePromise, logger, Logger, LogLevels, ILogger } from '@akala/core';
import { Stream } from 'stream';
import fs from 'fs'
import { runnerMiddleware } from './workflow-commands/process';
import { Container } from '@akala/commands';
import { DateRequest } from '@akala/cron';

export const defaultLogger = logger('automate', LogLevels.warn);

export const interpolate = new Interpolate('$(', ')');

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MiddlewareSignature<TSupportedJobSteps extends JobStepDef<string, any, any>> = [context: object & { logger: Logger }, step: TSupportedJobSteps, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }];

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TMiddlewareRunner<TSupportedJobSteps extends JobStepDef<string, any, any> = JobStepDef<string, unknown, unknown>> = Middleware<MiddlewareSignature<TSupportedJobSteps>>;

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MiddlewareRunnerMiddleware<TSupportedJobSteps extends JobStepDef<string, any, any>> implements TMiddlewareRunner<TSupportedJobSteps>
{
    constructor(public readonly support: TSupportedJobSteps['type'], private handler: (...args: MiddlewareSignature<TSupportedJobSteps>) => MiddlewarePromise, private doNotInterpolate?: boolean)
    {
    }

    async handle(...[context, step, stdio]: MiddlewareSignature<TSupportedJobSteps>)
    {
        if (!step[this.support])
            return Promise.resolve();

        if (!this.doNotInterpolate)
            step[this.support] = interpolate.buildObject(step[this.support])(context);

        return this.handler(context, step, stdio);
    }
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MiddlewareRunner<TSupportedJobSteps extends JobStepDef<string, any, any>> extends MiddlewareRunnerMiddleware<TSupportedJobSteps>
{
    constructor(support: TSupportedJobSteps['type'], handler: (...args: MiddlewareSignature<TSupportedJobSteps>) => Promise<unknown>, doNotInterpolate?: boolean)
    {
        super(support, async (...[context, step, stdio]: MiddlewareSignature<TSupportedJobSteps>) =>
        {
            try
            {
                const result = await handler(context, step, stdio);
                return Promise.reject(result);
            }
            catch (e)
            {
                return Promise.resolve(e);
            }
        }, doNotInterpolate);
    }
}

export const WithInterpolater = new MiddlewareRunnerMiddleware('with', () => { return Promise.resolve(); });

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export class ContainerMiddleware implements Middleware<MiddlewareSignature<JobStepDef<string, any, any>>> {
    constructor(private container: Container<unknown>) { }

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    async handle(...[context, step]: MiddlewareSignature<JobStepDef<string, any, any>>)
    {
        var resolved = Object.keys(step).map(k => [k, this.container.resolve(k)]).filter(k => k[1] instanceof Container) as [string, Container<unknown>][];
        const errors = (await mapAsync(resolved, k =>
            this.container.handle(step[k[0]], { _trigger: 'automate', ...context, ...step.with, param: [] })
        )).filter(err => err && err instanceof Error) as Error[];
        if (errors.length)
            if (errors.length === 1)
                return errors[1];
            else
                return new AggregateErrors(errors);
    }
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unused-vars
export const StdioMiddleware = new MiddlewareRunner('with', (...[context, step, stdio]: MiddlewareSignature<JobStepDef<'with', any, any>>) =>
{
    if (step.with && step.with.stdio && step.with.stdio !== 'pipe' && step.with.stdio !== 'ignore' && step.with.stdio !== 'inherit')
    {
        if (Array.isArray(step.with.stdio))
        {
            if (step.with.stdio.length > 0)
                step.with.stdio = step.with.stdio.map(io =>
                {
                    if (io !== 'pipe' && io !== 'ignore' && io !== 'inherit')
                    {
                        return fs.createReadStream(io);
                    }
                    return io;
                })
        }
    }

    return Promise.reject();
}, true);

export const IfMiddleware: TMiddlewareRunner<JobStepIf> = new MiddlewareRunner<JobStepIf>('if',
    (context, step) =>
    {
        if (!step.if)
            return Promise.resolve();
        try
        {
            if (!Parser.evalAsFunction(step.if, false)(context, false))
            {
                if (step.outputAs)
                    return Promise.reject(false);
                return Promise.reject();
            }
        }
        catch (e)
        {
            return Promise.resolve(e);
        }
    }, true);



//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ForeachMiddleware(runner: MiddlewareCompositeWithPriority<MiddlewareSignature<JobStepDef<string, any, any>>>)
{
    return new MiddlewareRunner<JobStepForEach>(
        'foreach', (context, step, stdio) => mapAsync(step.foreach, (item, index: string | number) =>
        {
            return runner.process(Object.assign({}, context, { $: item, $index: index }), Object.assign({}, step, { foreach: null, name: step.name + '#' + index }), stdio);
        }, step['foreach-strategy'] === 'wait-for-previous'));
}

export const LogMiddleware = new MiddlewareRunner<JobStepLog>('log', async (context, step) =>
{
    if (Array.isArray(step.log))
        context.logger[step.with && step.with['log-level'] || 'info'](...step.log);
    else
        context.logger[step.with && step.with['log-level'] || 'info'](step.log);
});


//eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RetryMiddleware(runner: MiddlewareCompositeWithPriority<MiddlewareSignature<JobStepDef<string, any, any>>>)
{
    return new MiddlewareRunnerMiddleware<JobStepDef<'retries', number, void>>(
        'retries', async (context, step, stdio) =>
    {
        for (let index = 0; index < step.retries; index++)
        {
            const err = await runner.handle(context, Object.assign({}, step, { retries: null, name: step.name + '#retry-' + index }), stdio);
            if (!err)
                return;
        }
    });
}

export const RunMiddleware = new MiddlewareRunner<JobStepRun>('run',
    async (context, step, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) =>
    {
        if (!step.with)
            step.with = {};
        const initialStdIoSetting = stdio && stdio[step.with.result] || stdio;
        const buffers: Buffer[] = [];
        const errBuffers: Buffer[] = [];
        if (typeof stdio == 'undefined')
            stdio = 'ignore';
        if (typeof (stdio) === 'string')
            stdio = { stdin: stdio, stderr: stdio, stdout: stdio };
        if (step.with.result && stdio[step.with.result] != 'pipe')
        {
            if (stdio[step.with.result] == 'ignore' || stdio[step.with.result] == 'inherit')
            {
                stdio[step.with.result] = 'pipe'
            }
        }

        return new Promise((resolve, reject) =>
        {
            var cmd: string[];
            if (!Array.isArray(step.run))
                cmd = [step.run];
            else
                cmd = step.run;

            context.logger.debug(cmd.join(' '));
            const cp = spawn(cmd[0], cmd.slice(1), Object.assign(step.with || {}, stdio, { timeout: step.with.timeout || 3600000 })).on('close', function (code)
            {
                if (code == 0)
                {
                    if (step.with.result)
                    {
                        const result = Buffer.concat(buffers);
                        switch (step.with.format)
                        {
                            case 'raw':
                                return resolve(result);
                            case 'json':
                                return resolve(JSON.parse(result.toString('utf-8')));
                            case 'jsonnd':
                                {
                                    const results = [];
                                    result.reduce((previous, current, index) =>
                                    {
                                        if (current === 10 && result[index - 1] == 125)
                                        {
                                            if (previous + 1 === index)
                                                return index;
                                            results.push(JSON.parse(result.toString('utf-8', previous, index).replace(/\n/g, '\\n')));
                                            return index + 1;
                                        }
                                        return previous;
                                    }, 0)
                                    return resolve(results);
                                }
                            default:
                            case 'string':
                                return resolve(result.toString('utf-8', 0, result.length - 1));
                        }
                    }
                    return resolve(undefined);
                }
                else
                {
                    if (step.with && step.with['ignore-failure'])
                        resolve(undefined);
                    else
                        reject(new Error((cmd as string[]).join(' ') + ' failed with code ' + code + '\n' + Buffer.concat(errBuffers).toString('utf-8')));
                }
            });
            if (step.with?.result)
                cp[step.with.result].on('data', chunk =>
                {
                    buffers.push(chunk);
                    if (initialStdIoSetting === 'inherit')
                        process.stdout.write(chunk);
                })
            cp.stderr.on('data', chunk =>
            {
                errBuffers.push(chunk);
            })
        });
    }
);

export function simpleRunner(name: string)
{
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    var runner = new MiddlewareCompositeWithPriority<MiddlewareSignature<JobStepDef<string, any, any>>>(name);
    runner.useMiddleware(1, ForeachMiddleware(runner));
    runner.useMiddleware(2, IfMiddleware);
    runner.useMiddleware(3, WithInterpolater);
    runner.useMiddleware(4, StdioMiddleware);
    runner.useMiddleware(5, RetryMiddleware(runner));
    runner.useMiddleware(100, RunMiddleware);
    runner.useMiddleware(20, LogMiddleware);
    return runner;
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function automate<TResult extends object, TSupportedJobSteps extends JobStepDef<string, any, any>>(workflow: Workflow, runner: TMiddlewareRunner<TSupportedJobSteps>, inputs?: { logger?: Logger }, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    // const inputForLog = !inputs ? '' : Object.entries(inputs).filter(e => e[0] !== 'logger').map(entry => entry[0] + '=' + JSON.stringify(entry[1])).join(", ");
    const logger = inputs?.logger || defaultLogger;

    orchestrator.on('task_start', (t) =>
    {
        logger.info('running %s', t.task);
        if (logger.silly.enabled)
            logger.silly('%O', Object.assign({}, inputs[workflow.name], { logger: undefined }));
    });
    orchestrator.on('task_stop', (t) =>
    {
        logger.info('ran %s successfully', t.task)
    });
    orchestrator.on('task_err', e =>
    {
        logger.error('task %s failed with message : %s', e.task, e.message);
        logger.error(e.err);
    });

    orchestrator.add('#main', Object.keys(workflow.jobs));

    const results = Object.assign({} as unknown as TResult);

    ensureDefaults(workflow.jobs);

    Object.keys(workflow.jobs).forEach(name =>
    {
        const job = workflow.jobs[name];
        const deps = [];
        deps.push(...job.steps.map(s => name + '-' + s.name));
        orchestrator.add(name + '#prerequisites', job.dependsOn || []);
        orchestrator.add(name, deps);
        let previousStepName: string = name + '#prerequisites';
        results[job.name] = {};
        job.steps.forEach(step =>
        {
            orchestrator.add(name + '-' + step.name, previousStepName && [previousStepName],
                async function (): Promise<void>
                {
                    var err;
                    const context = Object.assign({}, inputs, results);
                    logger.silly('%O', context);
                    try
                    {
                        err = await runner.handle(context, step as TSupportedJobSteps, stdio);
                    }
                    catch (result)
                    {
                        if (typeof result !== 'undefined' && step.outputAs)
                            results[job.name][step.outputAs] = result
                        return;
                    }
                    if (typeof err === 'undefined')
                        throw new Error(`this runner does not support ${JSON.stringify(step)}`);
                    throw err;
                    // if (runner[step.type])
                    // {
                    //     if (step.if)
                    //     {
                    //         if (!Parser.evalAsFunction(step.if, false)(results, false))
                    //         {
                    //             if (step.outputAs)
                    //                 results[job.name][step.outputAs] = false;
                    //             return;
                    //         }
                    //     }
                    //     if (step.foreach)
                    //     {
                    //         results[job.name][step.outputAs] = {};
                    //         if (typeof step.foreach === 'string')
                    //             step.foreach = interpolate.build(step.foreach)(results) as any;
                    //         // console.log(step.foreach)
                    //         await eachAsync(step.foreach, async (item, index) =>
                    //         {
                    //             if (item)
                    //                 if (step.outputAs)
                    //                     results[job.name][step.outputAs][item.name || index] = await runner[step.type].call(Object.assign({ $: item, $index: index }, results), step[step.type], step, stdio);
                    //                 else
                    //                     await runner[step.type].call(Object.assign({ $: item, $index: index }, results), step[step.type], step, stdio);
                    //         }, step['foreach-strategy'] == 'wait-for-previous');
                    //     }
                    //     else
                    //     {
                    //     }
                    // }
                    // else
                    //     throw new Error('this runner does not support uses');
                });
            previousStepName = name + '-' + step.name;
        });
    });

    return new Promise<TResult>((resolve, reject) =>
    {
        orchestrator.start('#main', (err) =>
        {
            if (err)
                if (workflow.on && 'failure' in workflow.on)
                    resolve(interpolate.buildObject(workflow.on.failure)(Object.assign({}, inputs, results)) as unknown as TResult);
                else
                    reject(err);
            else if (workflow.outputs)
                resolve(interpolate.buildObject(workflow.outputs)(Object.assign({}, inputs, results)) as TResult);
            else
                resolve(results);
        });
    });
}

export function ensureDefaults(jobs: Workflow['jobs'])
{
    jobs && Object.keys(jobs).forEach(jobName =>
    {
        jobs[jobName].name = jobs[jobName].name || jobName;
        if (typeof jobs[jobName].dependsOn == 'string')
            jobs[jobName].dependsOn = [jobs[jobName].dependsOn as unknown as string];
        jobs[jobName].steps.forEach(step =>
        {
            if (!step.outputAs && step.name)
                step.outputAs = step.name.replace(/[^\w](\w)/g, m => m[1].toUpperCase());
        })
    })
}

export { runnerMiddleware };

export interface Workflow
{
    name?: string;
    on: { [key in keyof TriggerMap]: TriggerMap[key] };
    outputs: string | object;
    parameters: string[];
    jobs: { [key: string]: Job };
}

export interface TriggerMap
{
    failure: string
    cron: string | DateRequest;
}

export interface Job
{
    name?: string;
    dependsOn: string[];
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    steps: JobStepDef<string, any, any>[];
}

type JobStepActor<T extends string, TActor = string> = {
    [k in T]: TActor;
}

export type JobStepDef<T extends string, TActor = string, TSettings = SerializableObject> = {
    type: T;
    name?: string;
    with: TSettings;
    foreach: { name: string, [key: string]: unknown }[];
    if: string;
    'foreach-strategy': 'wait-for-previous' | 'parallel';
    outputAs: string;
} & JobStepActor<T, TActor>;


export type JobStepUse = JobStepDef<'uses'>;
export type JobStepJob = JobStepDef<'job'>;
export type JobStepLog = JobStepDef<'log', string | [string, ...unknown[]], { 'log-level': keyof ILogger }>;
export type JobStepIf = JobStepDef<'if', string, void>;
export type JobStepForEach = JobStepDef<'foreach', string, void>;

export type JobStepRun = JobStepDef<'run', string | string[], SpawnOptionsWithoutStdio & { result?: 'stdout' | 'stderr', format?: 'jsonnd' | 'raw' | 'string' | 'json', timeout?: number }>;
export type JobStepDispatch = JobStepDef<'dispatch'>;

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/automate': commands.container;
    }
}