import { SelfDefinedCommand } from "@akala/commands";
import { type DateRequest, getTargets } from "./index.js";
import { Deferred, ErrorWithStatus, Event, EventListener, HttpStatusCode, IEventSink, ObservableArray, Subscription } from "@akala/core";

export interface State
{
    schedules: { [key: string]: Schedule };
    jobs: { [key: string]: JobLike };
}

export interface WaitInfo
{
    timeout: ReturnType<typeof setTimeout>,
    request: DateRequest,
    promise: Promise<void>,
    nextExecution: Date;
    abort: AbortController
}

export interface JobLike
{
    trigger: EventListener<IEventSink<[Schedule, WaitInfo], void, { once?: boolean }>>;
}

export class Schedule extends Event<[Schedule, WaitInfo], void, { once?: boolean }> implements IEventSink<[Schedule, WaitInfo], void, { once?: boolean }>
{
    private readonly requests: DateRequest[];

    constructor(public readonly name: string, requests: DateRequest[])
    {
        super();
        this.requests = requests;
        this.jobs.addListener(ev =>
        {

        })
    }

    private plannedExecutions: NodeJS.Timeout;
    private readonly jobs: ObservableArray<{ job: JobLike, subscription: Subscription }> = new ObservableArray([]);
    private _nextExecution: Date = null;
    public get nextExecution() { return this._nextExecution }

    public addJob(job: JobLike)
    {
        if (!this.jobs.find(x => x.job == job))
            this.jobs.push({ job, subscription: this.addListener(job.trigger.bind(job)) });
        else
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `job is already scheduled with this schedule`);
    }

    public removeJob(job: JobLike)
    {
        const jobIndex = this.jobs.findIndex(x => x.job == job);
        if (jobIndex == -1)
            throw new ErrorWithStatus(HttpStatusCode.Conflict, `job is not scheduled with this schedule`);

        const removedJob = this.jobs.splice(jobIndex, 1)[0];
        removedJob.subscription();
    }

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
            nextExecution: nextExecution.target,
            abort: new AbortController()
        };
    }

    start(startDate?: Date)
    {
        if (this._nextExecution !== null)
            throw new Error('This schedule is already started');
        const waitInfo = Schedule.wait(this.requests, startDate);
        // console.log(waitInfo);
        waitInfo.promise.then(() =>
        {
            this._nextExecution = null;
            this.emit(this, waitInfo)
            this.start();
        });
        waitInfo.abort.signal.addEventListener('abort', () => clearTimeout(waitInfo.timeout));

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

export class JobCommand extends SelfDefinedCommand<[{ params: [], waitInfo: WaitInfo, schedule: Schedule }]> implements JobLike
{
    trigger(schedule: Schedule, waitInfo: WaitInfo): void
    {
        const trigger = { params: [] } as { params: [], waitInfo: WaitInfo, schedule: Schedule };
        Object.defineProperty(trigger, 'waitInfo', { value: waitInfo, enumerable: false, writable: false, configurable: false })
        Object.defineProperty(trigger, 'schedule', { value: schedule, enumerable: false, writable: false, configurable: false })
        this.handler(trigger);
    }
}
