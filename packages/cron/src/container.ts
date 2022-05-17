/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'add-job-schedule', ...args: [Argument0<typeof import('./commands/add-job-schedule').default>, Argument1<typeof import('./commands/add-job-schedule').default>]): ReturnType<typeof import('./commands/add-job-schedule').default>
		dispatch (cmd:'$init', ...args: []): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'add-schedule', ...args: [Argument0<typeof import('./commands/add-schedule').default>, Argument1<typeof import('./commands/add-schedule').default>]): ReturnType<typeof import('./commands/add-schedule').default>
		dispatch (cmd:'add-job', ...args: [Argument0<typeof import('./commands/add-job').default>, Argument1<typeof import('./commands/add-job').default>, Argument2<typeof import('./commands/add-job').default>]): ReturnType<typeof import('./commands/add-job').default>
		dispatch (cmd:'list-jobs', ...args: []): ReturnType<typeof import('./commands/list-jobs').default>
		dispatch (cmd:'list-schedules', ...args: []): ReturnType<typeof import('./commands/list-schedules').default>
		dispatch (cmd:'remove-job-schedule', ...args: [Argument0<typeof import('./commands/remove-job-schedule').default>, Argument1<typeof import('./commands/remove-job-schedule').default>]): ReturnType<typeof import('./commands/remove-job-schedule').default>
		dispatch (cmd:'wait', ...args: []): ReturnType<typeof import('./commands/wait').default>
	}
	export interface proxy 
	{
		'add-job-schedule'(...args: [Argument0<typeof import('./commands/add-job-schedule').default>, Argument1<typeof import('./commands/add-job-schedule').default>]): ReturnType<typeof import('./commands/add-job-schedule').default>
		'$init'(...args: []): ReturnType<typeof import('./commands/$init').default>
		'add-schedule'(...args: [Argument0<typeof import('./commands/add-schedule').default>, Argument1<typeof import('./commands/add-schedule').default>]): ReturnType<typeof import('./commands/add-schedule').default>
		'add-job'(...args: [Argument0<typeof import('./commands/add-job').default>, Argument1<typeof import('./commands/add-job').default>, Argument2<typeof import('./commands/add-job').default>]): ReturnType<typeof import('./commands/add-job').default>
		'list-jobs'(...args: []): ReturnType<typeof import('./commands/list-jobs').default>
		'list-schedules'(...args: []): ReturnType<typeof import('./commands/list-schedules').default>
		'remove-job-schedule'(...args: [Argument0<typeof import('./commands/remove-job-schedule').default>, Argument1<typeof import('./commands/remove-job-schedule').default>]): ReturnType<typeof import('./commands/remove-job-schedule').default>
		'wait'(...args: []): ReturnType<typeof import('./commands/wait').default>
	}
}

export { commands as default };