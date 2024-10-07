//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: []): ReturnType<typeof import('./commands/$init.js').default>
		dispatch (cmd:'add-job', ...args: [Argument0<typeof import('./commands/add-job.js').default>, Argument1<typeof import('./commands/add-job.js').default>, Argument2<typeof import('./commands/add-job.js').default>]): ReturnType<typeof import('./commands/add-job.js').default>
		dispatch (cmd:'add-job-schedule', ...args: [Argument0<typeof import('./commands/add-job-schedule.js').default>, Argument1<typeof import('./commands/add-job-schedule.js').default>]): ReturnType<typeof import('./commands/add-job-schedule.js').default>
		dispatch (cmd:'add-schedule', ...args: [Argument0<typeof import('./commands/add-schedule.js').default>, Argument1<typeof import('./commands/add-schedule.js').default>]): ReturnType<typeof import('./commands/add-schedule.js').default>
		dispatch (cmd:'list-jobs', ...args: []): ReturnType<typeof import('./commands/list-jobs.js').default>
		dispatch (cmd:'list-schedules', ...args: []): ReturnType<typeof import('./commands/list-schedules.js').default>
		dispatch (cmd:'remove-job-schedule', ...args: [Argument0<typeof import('./commands/remove-job-schedule.js').default>, Argument1<typeof import('./commands/remove-job-schedule.js').default>]): ReturnType<typeof import('./commands/remove-job-schedule.js').default>
		dispatch (cmd:'wait', ...args: [Argument0<typeof import('./commands/wait.js').default>]): ReturnType<typeof import('./commands/wait.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./commands/$init.js').default>
		'add-job'(...args: [Argument0<typeof import('./commands/add-job.js').default>, Argument1<typeof import('./commands/add-job.js').default>, Argument2<typeof import('./commands/add-job.js').default>]): ReturnType<typeof import('./commands/add-job.js').default>
		'add-job-schedule'(...args: [Argument0<typeof import('./commands/add-job-schedule.js').default>, Argument1<typeof import('./commands/add-job-schedule.js').default>]): ReturnType<typeof import('./commands/add-job-schedule.js').default>
		'add-schedule'(...args: [Argument0<typeof import('./commands/add-schedule.js').default>, Argument1<typeof import('./commands/add-schedule.js').default>]): ReturnType<typeof import('./commands/add-schedule.js').default>
		'list-jobs'(...args: []): ReturnType<typeof import('./commands/list-jobs.js').default>
		'list-schedules'(...args: []): ReturnType<typeof import('./commands/list-schedules.js').default>
		'remove-job-schedule'(...args: [Argument0<typeof import('./commands/remove-job-schedule.js').default>, Argument1<typeof import('./commands/remove-job-schedule.js').default>]): ReturnType<typeof import('./commands/remove-job-schedule.js').default>
		'wait'(...args: [Argument0<typeof import('./commands/wait.js').default>]): ReturnType<typeof import('./commands/wait.js').default>
	}
   export const meta={"name":"@akala/cron","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts","inject":[]},"":{"inject":[]}}},{"name":"add-job","config":{"fs":{"path":"dist/esm/commands/add-job.js","source":"src/commands/add-job.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"add-job-schedule","config":{"fs":{"path":"dist/esm/commands/add-job-schedule.js","source":"src/commands/add-job-schedule.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"add-schedule","config":{"fs":{"path":"dist/esm/commands/add-schedule.js","source":"src/commands/add-schedule.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"list-jobs","config":{"fs":{"path":"dist/esm/commands/list-jobs.js","source":"src/commands/list-jobs.ts","inject":[]},"":{"inject":[]}}},{"name":"list-schedules","config":{"fs":{"path":"dist/esm/commands/list-schedules.js","source":"src/commands/list-schedules.ts","inject":[]},"":{"inject":[]}}},{"name":"remove-job-schedule","config":{"fs":{"path":"dist/esm/commands/remove-job-schedule.js","source":"src/commands/remove-job-schedule.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"wait","config":{"fs":{"path":"dist/esm/commands/wait.js","source":"src/commands/wait.ts","inject":["param.0"]},"":{"inject":[]},"cli":{"standalone":true,"inject":["options.riseSet","options.minutes","options.hour","options.day","options.month","options.lat","options.lng","options.tz"]}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };