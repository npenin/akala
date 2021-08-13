import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, exec, SpawnOptionsWithoutStdio } from 'child_process';
import commands from './container';
import { Container } from '@akala/commands';
import { AnyMiddleware, eachAsync, Interpolate, Middleware, MiddlewareCompositeWithPriority, MiddlewarePromise, Parser } from '@akala/core';
import { Stream } from 'stream';
import winston from 'winston';

export const interpolate = new Interpolate('$(', ')')

export type TMiddlewareRunner<TSupportedJobSteps extends JobStepDef<string, any, any>> = Middleware<[context: object, step: TSupportedJobSteps, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }]>

export class MiddlewareRunner<TSupportedJobSteps extends JobStepDef<string, any, any>> implements TMiddlewareRunner<TSupportedJobSteps>
{
    constructor(public readonly support: TSupportedJobSteps['type'], private handler: (...args: [context: object, step: TSupportedJobSteps, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }]) => Promise<unknown>)
    {
    }

    async handle(context: object, step: TSupportedJobSteps, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
    {
        if (!step[this.support])
            return Promise.resolve();
        try
        {
            const result = await this.handler(context, step, stdio);
            return Promise.reject(result);
        }
        catch (e)
        {
            return Promise.resolve(e);
        }
    }
}

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
    }
);
export function ForeachMiddleware(runner: TMiddlewareRunner<any>)
{
    return new MiddlewareRunner<JobStepDef<'foreach', string | Record<string, unknown> | unknown[], void>>(
        'foreach', async (context, step, stdio) =>
    {
        var each: Record<string, unknown> | unknown[];
        if (typeof step.foreach === 'string')
            each = interpolate.build(step.foreach)(context) as any;
        else
            each = step.foreach;
        console.log(each);

        const result = {};
        await eachAsync(each as any, async (item, index) =>
        {
            if (typeof item !== 'undefined')
                result[item['name'] || index] = await runner.handle(Object.assign({ $: item, $index: index }, context), Object.assign({}, step, { foreach: null }), stdio);

        }, step['foreach-strategy'] === 'wait-for-previous');
        return result;
    });
}

export const LogMiddleware = new MiddlewareRunner<JobStepLog>('log', async (context, step) =>
{
    console.log(interpolate.buildObject(step.log)(context));
}
);

export const RunMiddleware = new MiddlewareRunner<JobStepRun>('run',
    async (context, step, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) =>
    {
        if (!step.with)
            step.with = {};
        const initialStdIoSetting = stdio && stdio[step.with.result] || stdio;
        const buffers: Buffer[] = [];
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

            cmd = interpolate.buildObject(cmd)(context);
            console.log(cmd.join(' '));
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
                        reject(new Error((cmd as string[]).join(' ') + ' failed with code ' + code));
                }
            });
            if (step.with?.result)
                cp[step.with.result].on('data', chunk =>
                {
                    buffers.push(chunk);
                    if (initialStdIoSetting === 'inherit')
                        process.stdout.write(chunk);
                })
        });
    }
);

export function simpleRunner(name: string)
{
    var runner = new MiddlewareCompositeWithPriority(name);
    runner.useMiddleware(1, IfMiddleware);
    runner.useMiddleware(0, ForeachMiddleware(runner));
    runner.useMiddleware(100, RunMiddleware);
    runner.useMiddleware(20, LogMiddleware);
    return runner;
}

export default function automate<TResult extends object, TSupportedJobSteps extends JobStepDef<string, any, any>>(workflow: Workflow, runner: TMiddlewareRunner<TSupportedJobSteps>, inputs?: unknown, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    const inputForLog = !inputs ? '' : Object.entries(inputs).map(entry => entry[0] + '=' + JSON.stringify(entry[1])).join(", ");

    orchestrator.on('task_start', (t) =>
    {
        winston.info('running %s %s', t.task, inputForLog)
    });
    orchestrator.on('task_stop', (t) =>
    {
        winston.info('ran %s %s successfully', t.task, inputForLog)
    });

    orchestrator.add('#main', Object.keys(workflow.jobs));

    const results = Object.assign({} as unknown as TResult, inputs);

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
                    const result = await runner.handle(results, step as TSupportedJobSteps, stdio).then(err =>
                    {
                        if (typeof err === 'undefined')
                            throw new Error(`this runner does not support ${step}`);
                        throw err;
                    }, result => result);
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
                    if (typeof result !== 'undefined' && step.outputAs)
                        results[job.name][step.outputAs] = result
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
                    resolve(interpolate.buildObject(workflow.on.failure)(results) as unknown as TResult);
                else
                    reject(err);
            else if (workflow.outputs)
                resolve(interpolate.buildObject(workflow.outputs)(results) as TResult);
            else
                resolve(results);
        });
    });
}

export function ensureDefaults<TSupportedJobSteps extends JobStepDef<string, any, any>>(jobs: Workflow['jobs'])
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
}

export interface Job
{
    name?: string;
    dependsOn: string[];
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
export type JobStepLog = JobStepDef<'log', string, void>;
export type JobStepIf = JobStepDef<'if', string, void>;
export type JobStepForEach = JobStepDef<'foreach', string, void>;

export type JobStepRun = JobStepDef<'run', string | string[], SpawnOptionsWithoutStdio & { result?: 'stdout' | 'stderr', format?: 'jsonnd' | 'raw' | 'string' | 'json' }>;
export type JobStepDispatch = JobStepDef<'dispatch'>;

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/automate': commands.container;
    }
}