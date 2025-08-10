/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Argument0, Argument1, Argument2 } from '@akala/core';
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

export type { configuration as default };
