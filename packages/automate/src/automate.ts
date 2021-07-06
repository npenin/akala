import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, exec, SpawnOptionsWithoutStdio } from 'child_process';

export const simpleRunner: Runner<JobStepRun> = {
    run(cmd: string | string[], step: JobStepRun, stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
    {
        if (!Array.isArray(cmd))
            return new Promise<string>((resolve, reject) => exec(cmd, function (error, stdout)
            {
                if (error)
                    reject(error);
                else
                    resolve(stdout);
            }));
        else
            return new Promise<void>((resolve, reject) => spawn(cmd[0], cmd.slice(1), Object.assign(step.with, stdio)).on('close', function (code)
            {
                if (code == 0)
                    resolve();
                else
                    reject();
            }));
    }
}

type StepRunner<TStep extends JobStepDef<TType, unknown, unknown>, TType extends string> = (obj: TStep[TType],
    step: JobStepDef<TType>,
    stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) => Promise<void | string>;

export type Runner<TSupportedJobSteps extends JobStepDef<string, any, any>> = {
    [k in TSupportedJobSteps['type']]: StepRunner<JobStepDef<k, unknown, unknown>, k>
};

export default function automate<TSupportedJobSteps extends JobStepDef<string, any, any>>(workflow: Workflow['jobs'], runner: Runner<TSupportedJobSteps>, stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    orchestrator.on('task_start', (t) => console.log('running ' + t.task));
    orchestrator.on('task_stop', (t) => console.log(`ran ${t.task} successfully`));

    orchestrator.add('#main', Object.keys(workflow));

    ensureDefaults(workflow)

    Object.keys(workflow).forEach(name =>
    {
        const job = workflow[name];
        orchestrator.add(name, job.steps.map(s => name + '-' + s.name));
        let previousStepName: string;
        job.steps.forEach(step =>
        {
            orchestrator.add(name + '-' + step.name, previousStepName && [previousStepName],
                function ()
                {
                    if (runner[step.type])
                        return runner[step.type](step[step.type], step, stdio);
                    else
                        throw new Error('this runner does not support uses');
                });
        });
    });

    return new Promise<void>((resolve, reject) =>
    {
        orchestrator.start('#main', (err) =>
        {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}

export function ensureDefaults(jobs: Workflow['jobs'])
{
    jobs && Object.keys(jobs).forEach(jobName =>
    {
        jobs[jobName].name = jobs[jobName].name || jobName;
        jobs[jobName].steps.forEach(step =>
        {
            if (!step.type)
            {
                if ('run' in step)
                    step.type = 'run';
                if ('uses' in step)
                    step.type = 'uses';
                if ('dispatch' in step)
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

export type JobStepActor<T extends string, TActor = string> = {
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