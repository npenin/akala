/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace workflow
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: []): ReturnType<typeof import('./workflow-commands/$init').default>
		dispatch (cmd:'process', ...args: [Argument0<typeof import('./workflow-commands/process').default>]): ReturnType<typeof import('./workflow-commands/process').default>
		dispatch (cmd:'set-config', ...args: [Argument0<typeof import('./workflow-commands/set-config').default>]): ReturnType<typeof import('./workflow-commands/set-config').default>
		dispatch (cmd:'use', ...args: [Argument0<typeof import('./workflow-commands/use').default>, Argument1<typeof import('./workflow-commands/use').default>, Argument2<typeof import('./workflow-commands/use').default>]): ReturnType<typeof import('./workflow-commands/use').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./workflow-commands/$init').default>
		'process'(...args: [Argument0<typeof import('./workflow-commands/process').default>]): ReturnType<typeof import('./workflow-commands/process').default>
		'set-config'(...args: [Argument0<typeof import('./workflow-commands/set-config').default>]): ReturnType<typeof import('./workflow-commands/set-config').default>
		'use'(...args: [Argument0<typeof import('./workflow-commands/use').default>, Argument1<typeof import('./workflow-commands/use').default>, Argument2<typeof import('./workflow-commands/use').default>]): ReturnType<typeof import('./workflow-commands/use').default>
	}
}

export { workflow as default };