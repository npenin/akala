/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch(cmd: '$init', ...args: []): ReturnType<typeof import('./commands/$init').default>
		dispatch(cmd: 'schedule', ...args: [Argument0<typeof import('./commands/schedule').default>, Argument1<typeof import('./commands/schedule').default>, Argument2<typeof import('./commands/schedule').default>, Argument3<typeof import('./commands/schedule').default>, Argument4<typeof import('./commands/schedule').default>, Argument5<typeof import('./commands/schedule').default>, Argument6<typeof import('./commands/schedule').default>, Argument7<typeof import('./commands/schedule').default>, Argument8<typeof import('./commands/schedule').default>, Argument9<typeof import('./commands/schedule').default>, Argument10<typeof import('./commands/schedule').default>, Argument11<typeof import('./commands/schedule').default>]): ReturnType<typeof import('./commands/schedule').default>
		dispatch(cmd: 'wait', ...args: []): ReturnType<typeof import('./commands/wait').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./commands/$init').default>
		'schedule'(...args: [Argument0<typeof import('./commands/schedule').default>, Argument1<typeof import('./commands/schedule').default>, Argument2<typeof import('./commands/schedule').default>, Argument3<typeof import('./commands/schedule').default>, Argument4<typeof import('./commands/schedule').default>, Argument5<typeof import('./commands/schedule').default>, Argument6<typeof import('./commands/schedule').default>, Argument7<typeof import('./commands/schedule').default>, Argument8<typeof import('./commands/schedule').default>, Argument9<typeof import('./commands/schedule').default>, Argument10<typeof import('./commands/schedule').default>, Argument11<typeof import('./commands/schedule').default>]): ReturnType<typeof import('./commands/schedule').default>
		'wait'(...args: []): ReturnType<typeof import('./commands/wait').default>
	}
}

export { commands as default };