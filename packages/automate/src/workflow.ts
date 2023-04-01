//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace workflow
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./workflow-commands/$init.js').default>, Argument2<typeof import('./workflow-commands/$init.js').default>]): ReturnType<typeof import('./workflow-commands/$init.js').default>
		dispatch (cmd:'process', ...args: [Argument0<typeof import('./workflow-commands/process.js').default>, Argument1<typeof import('./workflow-commands/process.js').default>]): ReturnType<typeof import('./workflow-commands/process.js').default>
		dispatch (cmd:'set-config', ...args: [Argument0<typeof import('./workflow-commands/set-config.js').default>]): ReturnType<typeof import('./workflow-commands/set-config.js').default>
		dispatch (cmd:'use', ...args: [Argument1<typeof import('./workflow-commands/use.js').default>, Argument2<typeof import('./workflow-commands/use.js').default>]): ReturnType<typeof import('./workflow-commands/use.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./workflow-commands/$init.js').default>, Argument2<typeof import('./workflow-commands/$init.js').default>]): ReturnType<typeof import('./workflow-commands/$init.js').default>
		'process'(...args: [Argument0<typeof import('./workflow-commands/process.js').default>, Argument1<typeof import('./workflow-commands/process.js').default>]): ReturnType<typeof import('./workflow-commands/process.js').default>
		'set-config'(...args: [Argument0<typeof import('./workflow-commands/set-config.js').default>]): ReturnType<typeof import('./workflow-commands/set-config.js').default>
		'use'(...args: [Argument1<typeof import('./workflow-commands/use.js').default>, Argument2<typeof import('./workflow-commands/use.js').default>]): ReturnType<typeof import('./workflow-commands/use.js').default>
	}
}

export { workflow as default };