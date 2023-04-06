//eslint-disable-next-line @typescript-eslint/no-unused-vars
//@ts-ignore 6133
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'publish', ...args: [Argument0<typeof import('./commands/publish.js').default>, Argument1<typeof import('./commands/publish.js').default>]): ReturnType<typeof import('./commands/publish.js').default>
		dispatch (cmd:'subscribe', ...args: [Argument0<typeof import('./commands/subscribe.js').default>, Argument1<typeof import('./commands/subscribe.js').default>, Argument2<typeof import('./commands/subscribe.js').default>]): ReturnType<typeof import('./commands/subscribe.js').default>
		dispatch (cmd:'unsubscribe', ...args: [Argument0<typeof import('./commands/unsubscribe.js').default>, Argument1<typeof import('./commands/unsubscribe.js').default>]): ReturnType<typeof import('./commands/unsubscribe.js').default>
	}
	export interface proxy 
	{
		'publish'(...args: [Argument0<typeof import('./commands/publish.js').default>, Argument1<typeof import('./commands/publish.js').default>]): ReturnType<typeof import('./commands/publish.js').default>
		'subscribe'(...args: [Argument0<typeof import('./commands/subscribe.js').default>, Argument1<typeof import('./commands/subscribe.js').default>, Argument2<typeof import('./commands/subscribe.js').default>]): ReturnType<typeof import('./commands/subscribe.js').default>
		'unsubscribe'(...args: [Argument0<typeof import('./commands/unsubscribe.js').default>, Argument1<typeof import('./commands/unsubscribe.js').default>]): ReturnType<typeof import('./commands/unsubscribe.js').default>
	}
}

export { commands as default };