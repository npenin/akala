import { SerializableObject } from '@akala/json-rpc-ws'
import Orchestrator from 'orchestrator';
import { spawn, StdioNull, StdioPipe, exec, SpawnOptionsWithoutStdio } from 'child_process';

export const simpleRunner = {
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
            return new Promise<void>((resolve, reject) => spawn(cmd[0], cmd.slice(1), Object.assign(step, stdio)).on('close', function (code)
            {
                if (code == 0)
                    resolve();
                else
                    reject();
            }));
    }
}

type StepRunner<TStep extends JobStep> = (obj: TStep[TStep['type']],
    step: JobStep,
    stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) => Promise<void>;

export type Runner<TStep extends JobStep = JobStep, TType extends TStep['type'] = 'run' | 'dispatch' | 'uses'> = {
    [k in JobStep['type']]: (obj: JobStep[TType],
        step: JobStep,
        stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe }) => Promise<void>
};

export default function run(workflow: Workflow, runner: Runner, stdio?: { stdin: StdioNull | StdioPipe, stdout: StdioNull | StdioPipe, stderr: StdioNull | StdioPipe })
{
    const orchestrator = new Orchestrator();
    orchestrator.add(workflow.name || 'main', Object.keys(workflow.jobs));

    Object.keys(workflow.jobs).forEach(name =>
    {
        const job = workflow.jobs[name];
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
}

export function ensureDefaults(workflow: Workflow)
{
    workflow.jobs && Object.keys(workflow.jobs).forEach(jobName =>
    {
        workflow.jobs[jobName].name = workflow.jobs[jobName].name || jobName;
        workflow.jobs[jobName].steps.forEach(step =>
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
    steps: JobStep[];
}

export type JobStepDef<T extends string> = {
    type: T
    [k in T]: string;
}


export type JobStep = JobAction | JobStepRun | JobStepDispatch;

export interface JobAction extends JobStepDef<'uses'>
{
    type: 'uses';
    name?: string;
    uses: string;
    with: SerializableObject;
}

export interface JobStepRun
{
    type: 'run';
    name?: string;
    run: string | string[];
    with: SpawnOptionsWithoutStdio;
}
export interface JobStepDispatch
{
    type: 'dispatch';
    name?: string;
    dispatch: string;
    with: SerializableObject;
}