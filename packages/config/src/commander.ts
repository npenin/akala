/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace configuration
{
	export interface container 
	{
		dispatch(cmd: 'commit', ...args: [Argument1<typeof import('./commands/commit.js').default>]): ReturnType<typeof import('./commands/commit.js').default>
		dispatch(cmd: 'get', ...args: [Argument0<typeof import('./commands/get.js').default>, Argument1<typeof import('./commands/get.js').default>]): ReturnType<typeof import('./commands/get.js').default>
		dispatch(cmd: 'revert', ...args: [Argument0<typeof import('./commands/revert.js').default>]): ReturnType<typeof import('./commands/revert.js').default>
		dispatch(cmd: 'set', ...args: [Argument0<typeof import('./commands/set.js').default>, Argument1<typeof import('./commands/set.js').default>, Argument2<typeof import('./commands/set.js').default>]): ReturnType<typeof import('./commands/set.js').default>
	}
	export interface proxy 
	{
		'commit'(...args: [Argument1<typeof import('./commands/commit.js').default>]): ReturnType<typeof import('./commands/commit.js').default>
		'get'(...args: [Argument0<typeof import('./commands/get.js').default>, Argument1<typeof import('./commands/get.js').default>]): ReturnType<typeof import('./commands/get.js').default>
		'revert'(...args: [Argument0<typeof import('./commands/revert.js').default>]): ReturnType<typeof import('./commands/revert.js').default>
		'set'(...args: [Argument0<typeof import('./commands/set.js').default>, Argument1<typeof import('./commands/set.js').default>, Argument2<typeof import('./commands/set.js').default>]): ReturnType<typeof import('./commands/set.js').default>
	}
}

export { configuration as default };