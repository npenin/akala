//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, type ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: []): ReturnType<typeof import('./commands/$init.ts').default>
		dispatch (cmd:'add-job', ...args: [Argument0<typeof import('./commands/add-job.ts').default>, Argument1<typeof import('./commands/add-job.ts').default>, Argument2<typeof import('./commands/add-job.ts').default>]): ReturnType<typeof import('./commands/add-job.ts').default>
		dispatch (cmd:'add-job-schedule', ...args: [Argument0<typeof import('./commands/add-job-schedule.ts').default>, Argument1<typeof import('./commands/add-job-schedule.ts').default>]): ReturnType<typeof import('./commands/add-job-schedule.ts').default>
		dispatch (cmd:'add-schedule', ...args: [Argument0<typeof import('./commands/add-schedule.ts').default>, Argument1<typeof import('./commands/add-schedule.ts').default>]): ReturnType<typeof import('./commands/add-schedule.ts').default>
		dispatch (cmd:'list-jobs', ...args: []): ReturnType<typeof import('./commands/list-jobs.ts').default>
		dispatch (cmd:'list-schedules', ...args: []): ReturnType<typeof import('./commands/list-schedules.ts').default>
		dispatch (cmd:'remove-job-schedule', ...args: [Argument0<typeof import('./commands/remove-job-schedule.ts').default>, Argument1<typeof import('./commands/remove-job-schedule.ts').default>]): ReturnType<typeof import('./commands/remove-job-schedule.ts').default>
		dispatch (cmd:'wait', ...args: [Argument0<typeof import('./commands/wait.ts').default>]): ReturnType<typeof import('./commands/wait.ts').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./commands/$init.ts').default>
		'add-job'(...args: [Argument0<typeof import('./commands/add-job.ts').default>, Argument1<typeof import('./commands/add-job.ts').default>, Argument2<typeof import('./commands/add-job.ts').default>]): ReturnType<typeof import('./commands/add-job.ts').default>
		'add-job-schedule'(...args: [Argument0<typeof import('./commands/add-job-schedule.ts').default>, Argument1<typeof import('./commands/add-job-schedule.ts').default>]): ReturnType<typeof import('./commands/add-job-schedule.ts').default>
		'add-schedule'(...args: [Argument0<typeof import('./commands/add-schedule.ts').default>, Argument1<typeof import('./commands/add-schedule.ts').default>]): ReturnType<typeof import('./commands/add-schedule.ts').default>
		'list-jobs'(...args: []): ReturnType<typeof import('./commands/list-jobs.ts').default>
		'list-schedules'(...args: []): ReturnType<typeof import('./commands/list-schedules.ts').default>
		'remove-job-schedule'(...args: [Argument0<typeof import('./commands/remove-job-schedule.ts').default>, Argument1<typeof import('./commands/remove-job-schedule.ts').default>]): ReturnType<typeof import('./commands/remove-job-schedule.ts').default>
		'wait'(...args: [Argument0<typeof import('./commands/wait.ts').default>]): ReturnType<typeof import('./commands/wait.ts').default>
	}
   export const meta={"name":"@akala/cron","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts","inject":[]},"":{"inject":[]}}},{"name":"add-job","config":{"fs":{"inject":["params.0","params.1","params.2"],"path":"dist/esm/commands/add-job.js","source":"src/commands/add-job.ts"},"":{"inject":["params.0","params.1","params.2"]},"jsonrpc":{"inject":["param.0","$container","param.1"]}}},{"name":"add-job-schedule","config":{"fs":{"inject":["params.0","params.1"],"path":"dist/esm/commands/add-job-schedule.js","source":"src/commands/add-job-schedule.ts"},"":{"inject":["params.0","params.1"]}}},{"name":"add-schedule","config":{"fs":{"inject":["params.0","params.1"],"path":"dist/esm/commands/add-schedule.js","source":"src/commands/add-schedule.ts"},"":{"inject":["params.0","params.1"]},"cli":true}},{"name":"list-jobs","config":{"fs":{"inject":[],"path":"dist/esm/commands/list-jobs.js","source":"src/commands/list-jobs.ts"},"":{"inject":[]},"cli":true}},{"name":"list-schedules","config":{"fs":{"inject":[],"path":"dist/esm/commands/list-schedules.js","source":"src/commands/list-schedules.ts"},"":{"inject":[]},"cli":true}},{"name":"remove-job-schedule","config":{"fs":{"path":"dist/esm/commands/remove-job-schedule.js","source":"src/commands/remove-job-schedule.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]}}},{"name":"wait","config":{"fs":{"path":"dist/esm/commands/wait.js","source":"src/commands/wait.ts","inject":["params.0"]},"":{"inject":[]},"cli":{"standalone":true,"inject":["options.riseSet","options.minutes","options.hour","options.day","options.month","options.lat","options.lng","options.tz"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };