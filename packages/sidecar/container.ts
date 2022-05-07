/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./src/commands/$init').default>]): ReturnType<typeof import('./src/commands/$init').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./src/commands/$init').default>]): ReturnType<typeof import('./src/commands/$init').default>
	}
}

export { commands as default };