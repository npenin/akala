//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'add-loader', ...args: [Argument0<typeof import('./commands/add-loader.js').default>, Argument1<typeof import('./commands/add-loader.js').default>]): ReturnType<typeof import('./commands/add-loader.js').default>
		dispatch (cmd:'compile', ...args: []): ReturnType<typeof import('./commands/compile.js').default>
	}
	export interface proxy 
	{
		'add-loader'(...args: [Argument0<typeof import('./commands/add-loader.js').default>, Argument1<typeof import('./commands/add-loader.js').default>]): ReturnType<typeof import('./commands/add-loader.js').default>
		'compile'(...args: []): ReturnType<typeof import('./commands/compile.js').default>
	}
}

export { commands as default };