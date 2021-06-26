/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace configuration
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'commit', ...args: [Argument1<typeof import('./commands/commit').default>]): ReturnType<typeof import('./commands/commit').default>
		dispatch (cmd:'get', ...args: [Argument0<typeof import('./commands/get').default>, Argument1<typeof import('./commands/get').default>]): ReturnType<typeof import('./commands/get').default>
		dispatch (cmd:'revert', ...args: [Argument0<typeof import('./commands/revert').default>]): ReturnType<typeof import('./commands/revert').default>
		dispatch (cmd:'set', ...args: [Argument0<typeof import('./commands/set').default>, Argument1<typeof import('./commands/set').default>, Argument2<typeof import('./commands/set').default>]): ReturnType<typeof import('./commands/set').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		'commit'(...args: [Argument1<typeof import('./commands/commit').default>]): ReturnType<typeof import('./commands/commit').default>
		'get'(...args: [Argument0<typeof import('./commands/get').default>, Argument1<typeof import('./commands/get').default>]): ReturnType<typeof import('./commands/get').default>
		'revert'(...args: [Argument0<typeof import('./commands/revert').default>]): ReturnType<typeof import('./commands/revert').default>
		'set'(...args: [Argument0<typeof import('./commands/set').default>, Argument1<typeof import('./commands/set').default>, Argument2<typeof import('./commands/set').default>]): ReturnType<typeof import('./commands/set').default>
	}
}

export { configuration as default };