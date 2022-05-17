/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'subscribe', ...args: [Argument0<typeof import('./commands/subscribe').default>, Argument1<typeof import('./commands/subscribe').default>, Argument2<typeof import('./commands/subscribe').default>]): ReturnType<typeof import('./commands/subscribe').default>
		dispatch (cmd:'publish', ...args: [Argument0<typeof import('./commands/publish').default>, Argument1<typeof import('./commands/publish').default>]): ReturnType<typeof import('./commands/publish').default>
		dispatch (cmd:'unsubscribe', ...args: [Argument0<typeof import('./commands/unsubscribe').default>, Argument1<typeof import('./commands/unsubscribe').default>]): ReturnType<typeof import('./commands/unsubscribe').default>
	}
	export interface proxy 
	{
		'subscribe'(...args: [Argument0<typeof import('./commands/subscribe').default>, Argument1<typeof import('./commands/subscribe').default>, Argument2<typeof import('./commands/subscribe').default>]): ReturnType<typeof import('./commands/subscribe').default>
		'publish'(...args: [Argument0<typeof import('./commands/publish').default>, Argument1<typeof import('./commands/publish').default>]): ReturnType<typeof import('./commands/publish').default>
		'unsubscribe'(...args: [Argument0<typeof import('./commands/unsubscribe').default>, Argument1<typeof import('./commands/unsubscribe').default>]): ReturnType<typeof import('./commands/unsubscribe').default>
	}
}

export { commands as default };