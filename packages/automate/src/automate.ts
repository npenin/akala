import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, exec, SpawnOptionsWithoutStdio } from 'child_process';
import commands from './container';
import { Container } from '@akala/commands';
import { eachAsync, Interpolate } from '@akala/core';
import { Stream } from 'stream';

export const interpolate = new Interpolate('$(', ')')

export const simpleRunner: Runner<JobStepRun | JobStepLog> = {
    log(cmd: string | string[])
    {
        console.log(interpolate.buildObject(cmd)(this));
        return Promise.resolve();
    },
    run(cmd: string | string[], step: JobStepRun, stdio?: Exclude<StdioNull, Stream> | StdioPipe | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
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

        return new Promise<unknown>((resolve, reject) =>
        {
            if (!Array.isArray(cmd))
                cmd = [cmd];

            cmd = interpolate.buildObject(cmd)(this);
            console.log(cmd.join(' '));
            var cp = spawn(cmd[0], cmd.slice(1), Object.assign(step.with || {}, stdio, { timeout: step.with.timeout || 3600000 })).on('close', function (code)
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
                    reject();
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
}

type StepRunner<TStep extends JobStepDef<TType, any, any>, TType extends string> = (obj: TStep[TType],
    step: TStep,
    stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) => Promise<unknown>;

export type Runner<TSupportedJobSteps extends JobStepDef<string, any, any>> = {
    [k in TSupportedJobSteps['type']]: StepRunner<TSupportedJobSteps extends JobStepDef<k, infer TActor, infer TSettings> ? TSupportedJobSteps : never, k>
};

export default function automate<TResult extends object, TSupportedJobSteps extends JobStepDef<string, any, any>>(workflow: Workflow, runner: Runner<TSupportedJobSteps>, inputs?: unknown, stdio?: Exclude<StdioNull, Stream> | { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    const inputForLog = !inputs ? '' : Object.entries(inputs).map(entry => entry[0] + '=' + JSON.stringify(entry[1])).join(", ");

    // orchestrator.on('task_start', (t) => console.log('running ' + t.task + ' ' + inputForLog));
    // orchestrator.on('task_stop', (t) => console.log(`ran ${t.task + ' ' + inputForLog} successfully`));

    orchestrator.add('#main', Object.keys(workflow.jobs));

    const results = Object.assign({} as unknown as TResult, inputs);

    ensureDefaults(workflow.jobs, runner);

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
                async function ()
                {
                    if (runner[step.type])
                    {
                        if (step.foreach)
                        {
                            results[job.name][step.outputAs] = {};
                            if (typeof step.foreach === 'string')
                                step.foreach = interpolate.build(step.foreach)(results) as any;
                            await eachAsync(step.foreach, async item =>
                            {
                                if (step.outputAs)
                                    results[job.name][step.outputAs][item.name] = await runner[step.type].call(Object.assign({ $: item }, results), step[step.type], step, stdio);
                                else
                                    await runner[step.type].call(Object.assign({ $: item }, results), step[step.type], step, stdio);
                            }, step['foreach-strategy'] == 'wait-for-previous');
                        }
                        else
                        {
                            if (step.outputAs)
                                results[job.name][step.outputAs] = await runner[step.type].call(results, step[step.type], step, stdio);
                            else
                                await runner[step.type].call(results, step[step.type], step, stdio);
                        }
                    }
                    else
                        throw new Error('this runner does not support uses');
                });
            previousStepName = name + '-' + step.name;
        });
    });

    return new Promise<TResult>((resolve, reject) =>
    {
        orchestrator.start('#main', (err) =>
        {
            if (err)
                reject(err);
            else if (workflow.outputs)
                resolve(interpolate.buildObject(workflow.outputs)(results) as TResult);
            else
                resolve(results);
        });
    });
}

export function ensureDefaults<TSupportedJobSteps extends JobStepDef<string, any, any>>(jobs: Workflow['jobs'], runner: Runner<TSupportedJobSteps>)
{
    jobs && Object.keys(jobs).forEach(jobName =>
    {
        jobs[jobName].name = jobs[jobName].name || jobName;
        if (typeof jobs[jobName].dependsOn == 'string')
            jobs[jobName].dependsOn = [jobs[jobName].dependsOn as unknown as string];
        jobs[jobName].steps.forEach(step =>
        {
            if (!step.type)
            {
                if ('run' in step)
                    step.type = 'run';
                else if ('uses' in step)
                    step.type = 'uses';
                else if ('dispatch' in step)
                    step.type = 'dispatch';
                else if ('job' in step)
                    step.type = 'job';
                else
                {
                    var types = Object.keys(runner).filter(k => k in step);
                    if (types.length !== 1)
                        throw new Error(`Invalid step type ${JSON.stringify(step)}`);
                    step.type = types[0];
                }
            }
            if (!step.outputAs && step.name)
                step.outputAs = step.name.replace(/[^\w](\w)/g, m => m[1].toUpperCase());

            if (!step.name)
                step.name = step[step.type].toString();

        })
    })
}

export interface Workflow
{
    name?: string;
    on: string[];
    outputs: string | object;
    parameters: string[];
    jobs: { [key: string]: Job };
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
    'foreach-strategy': 'wait-for-previous' | 'parallel';
    outputAs: string;
} & JobStepActor<T, TActor>;


export type JobStepUse = JobStepDef<'uses'>;
export type JobStepJob = JobStepDef<'job'>;
export type JobStepLog = JobStepDef<'log', string, void>;

export type JobStepRun = JobStepDef<'run', string | string[], SpawnOptionsWithoutStdio & { result?: 'stdout' | 'stderr', format?: 'jsonnd' | 'raw' | 'string' | 'json' }>;
export type JobStepDispatch = JobStepDef<'dispatch'>;

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/automate': commands.container;
    }
}