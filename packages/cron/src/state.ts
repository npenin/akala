import { SelfDefinedCommand } from "@akala/commands";
import { DateRequest, getTargets } from "./index.js";
import { Deferred } from "@akala/core";

export interface State
{
    schedules: { [key: string]: Schedule };
    jobs: { [key: string]: JobLike };
}

export interface WaitInfo
{
    timeout: NodeJS.Timeout,
    request: DateRequest,
    promise: Promise<void>,
    nextExecution: Date;
}

export interface JobLike
{
    trigger(schedule: Schedule, waitInfo: WaitInfo): void;
}

export class Schedule
{
    private readonly requests: DateRequest[];

    constructor(public readonly name: string, requests: DateRequest[])
    {
        this.requests = requests;
    }

    private plannedExecutions: NodeJS.Timeout;
    public readonly jobs: JobLike[] = [];
    private _nextExecution: Date = null;
    public get nextExecution() { return this._nextExecution }

    public static wait(request: DateRequest[], startDate?: Date): WaitInfo
    {
        const nextExecution = getTargets(request, startDate)[0];
        const deferred = new Deferred<void>();
        return {
            timeout: setTimeout(() =>
            {
                deferred.resolve();
            }, nextExecution.target.valueOf() - new Date().valueOf()),
            request: nextExecution.request,
            promise: deferred,
            nextExecution: nextExecution.target
        };
    }

    start(startDate?: Date)
    {
        if (this._nextExecution !== null)
            throw new Error('This schedule is already started');
        const waitInfo = Schedule.wait(this.requests, startDate);
        console.log(waitInfo);
        waitInfo.promise.then(() =>
        {
            this._nextExecution = null;
            this.jobs.map(j => j.trigger(this, waitInfo));
            this.start();
        });

        this._nextExecution = waitInfo.nextExecution
        this.plannedExecutions = waitInfo.timeout;
    }

    stop()
    {
        clearTimeout(this.plannedExecutions);
        this._nextExecution = null;
    }
}


export class Job implements JobLike
{
    private readonly schedules: Schedule[]

    constructor(private handler?: (schedule?: Schedule, waitinfo?: WaitInfo) => Promise<void> | void, ...schedules: Schedule[])
    {
        this.schedules = schedules;
    }

    public multipleExecutions: number = 1;
    private currentExecutions: number = 0;
    private _skipNext: Schedule[] = [];

    public enabled = true;

    public trigger(schedule: Schedule, waitinfo: WaitInfo)
    {
        if (!this.enabled)
            return;
        if (this.multipleExecutions !== 0 && this.multipleExecutions == this.currentExecutions)
            return;
        const indexOfSchedule = this._skipNext.indexOf(schedule)
        if (this._skipNext.length > 0 && this._skipNext.indexOf(schedule) > -1)
        {
            this._skipNext.splice(indexOfSchedule, 1);
            return;
        }

        try
        {
            var p = this.handler(schedule, waitinfo);
        }
        finally
        {
            if (p && this.multipleExecutions > 0 && ++this.currentExecutions < this.multipleExecutions)
            {
                p.finally(() => this.currentExecutions--);
            }
        }
    }

    public nextRuns()
    {
        return this.schedules.filter(s => s.nextExecution).sort((a, b) => a.nextExecution.valueOf() - b.nextExecution.valueOf());
    }

    public skipNext(schedule?: Schedule)
    {
        if (!schedule)
        {
            schedule = this.nextRuns()[0];
            if (!schedule)
                throw new Error('this job is not scheduled');
        }
        else
        {
            const indexOfSchedule = this.schedules.indexOf(schedule);
            if (indexOfSchedule == -1)
                return false;
        }
        this._skipNext.push(schedule);
        return true;
    }
}

export class JobCommand extends SelfDefinedCommand implements JobLike
{
    trigger(schedule: Schedule, waitInfo: WaitInfo): void
    {
        const trigger = { param: [] };
        Object.defineProperty(trigger, 'waitInfo', { value: waitInfo, enumerable: false, writable: false, configurable: false })
        Object.defineProperty(trigger, 'schedule', { value: schedule, enumerable: false, writable: false, configurable: false })
        this.handler(trigger);
    }
}