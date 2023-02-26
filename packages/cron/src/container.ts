/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch(cmd: '$init', ...args: []): ReturnType<typeof import('./commands/$init.js').default>
		dispatch(cmd: 'add-job-schedule', ...args: [Argument0<typeof import('./commands/add-job-schedule.js').default>, Argument1<typeof import('./commands/add-job-schedule.js').default>]): ReturnType<typeof import('./commands/add-job-schedule.js').default>
		dispatch(cmd: 'add-job', ...args: [Argument0<typeof import('./commands/add-job.js').default>, Argument1<typeof import('./commands/add-job.js').default>, Argument2<typeof import('./commands/add-job.js').default>]): ReturnType<typeof import('./commands/add-job.js').default>
		dispatch(cmd: 'add-schedule', ...args: [Argument0<typeof import('./commands/add-schedule.js').default>, Argument1<typeof import('./commands/add-schedule.js').default>]): ReturnType<typeof import('./commands/add-schedule.js').default>
		dispatch(cmd: 'list-jobs', ...args: []): ReturnType<typeof import('./commands/list-jobs.js').default>
		dispatch(cmd: 'list-schedules', ...args: []): ReturnType<typeof import('./commands/list-schedules.js').default>
		dispatch(cmd: 'remove-job-schedule', ...args: [Argument0<typeof import('./commands/remove-job-schedule.js').default>, Argument1<typeof import('./commands/remove-job-schedule.js').default>]): ReturnType<typeof import('./commands/remove-job-schedule.js').default>
		dispatch(cmd: 'wait', ...args: []): ReturnType<typeof import('./commands/wait.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./commands/$init.js').default>
		'add-job-schedule'(...args: [Argument0<typeof import('./commands/add-job-schedule.js').default>, Argument1<typeof import('./commands/add-job-schedule.js').default>]): ReturnType<typeof import('./commands/add-job-schedule.js').default>
		'add-job'(...args: [Argument0<typeof import('./commands/add-job.js').default>, Argument1<typeof import('./commands/add-job.js').default>, Argument2<typeof import('./commands/add-job.js').default>]): ReturnType<typeof import('./commands/add-job.js').default>
		'add-schedule'(...args: [Argument0<typeof import('./commands/add-schedule.js').default>, Argument1<typeof import('./commands/add-schedule.js').default>]): ReturnType<typeof import('./commands/add-schedule.js').default>
		'list-jobs'(...args: []): ReturnType<typeof import('./commands/list-jobs.js').default>
		'list-schedules'(...args: []): ReturnType<typeof import('./commands/list-schedules.js').default>
		'remove-job-schedule'(...args: [Argument0<typeof import('./commands/remove-job-schedule.js').default>, Argument1<typeof import('./commands/remove-job-schedule.js').default>]): ReturnType<typeof import('./commands/remove-job-schedule.js').default>
		'wait'(...args: []): ReturnType<typeof import('./commands/wait.js').default>
	}
}

export { commands as default };