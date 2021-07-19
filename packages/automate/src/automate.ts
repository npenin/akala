import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, exec, SpawnOptionsWithoutStdio } from 'child_process';
import commands from './container';
import { Container } from '@akala/commands';
import { Interpolate } from '@akala/core';

export const simpleRunner: Runner<JobStepRun> = {
    run(cmd: string | string[], step: JobStepRun, stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
    {
        if (!Array.isArray(cmd))
            return new Promise<string>((resolve, reject) => exec(Interpolate.build(cmd)({ $: this }), function (error, stdout)
            {
                if (error)
                    reject(error);
                else
                    resolve(stdout.substr(0, stdout.length - 1));
            }));
        else
            return new Promise<void>((resolve, reject) => spawn(cmd[0], cmd.slice(1).map(arg => Interpolate.build(arg)({ $: this })), Object.assign(step.with || {}, stdio)).on('close', function (code)
            {
                if (code == 0)
                    resolve();
                else
                    reject();
            }));
    }
}

type StepRunner<TStep extends JobStepDef<TType, any, any>, TType extends string> = (obj: TStep[TType],
    step: TStep,
    stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) => Promise<void | string>;

export type Runner<TSupportedJobSteps extends JobStepDef<string, any, any>> = {
    [k in TSupportedJobSteps['type']]: StepRunner<TSupportedJobSteps extends JobStepDef<k, infer TActor, infer TSettings> ? TSupportedJobSteps : never, k>
};

export default function automate<TResult extends object, TSupportedJobSteps extends JobStepDef<string, any, any>>(workflow: Workflow['jobs'], runner: Runner<TSupportedJobSteps>, stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    orchestrator.on('task_start', (t) => console.log('running ' + t.task));
    orchestrator.on('task_stop', (t) => console.log(`ran ${t.task} successfully`));

    orchestrator.add('#main', Object.keys(workflow));

    const results = {} as unknown as TResult;

    ensureDefaults(workflow)

    Object.keys(workflow).forEach(name =>
    {
        const job = workflow[name];
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
                        results[job.name][step.name] = await runner[step.type].call(results, step[step.type], step, stdio);
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
            if (!step.type)
            {
                if ('run' in step)
                    step.type = 'run';
                else if ('uses' in step)
                    step.type = 'uses';
                else if ('dispatch' in step)
                    step.type = 'dispatch';
                else
                    throw new Error(`Invalid step ${JSON.stringify(step)}`);
            }

            if (!step.name)
                step.name = step[step.type].toString();
        })
    })
}

export interface Workflow
{
    name?: string;
    on: string[];
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
} & JobStepActor<T, TActor>;


export type JobStep = JobAction | JobStepRun | JobStepDispatch;

export type JobAction = JobStepDef<'uses'>;

export type JobStepRun = JobStepDef<'run', string | string[], SpawnOptionsWithoutStdio>;
export type JobStepDispatch = JobStepDef<'dispatch'>;

declare module '@akala/pm'
{
    export interface SidecarMap
    {
        '@akala/automate': commands.container;
    }
}