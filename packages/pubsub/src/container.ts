import {Metadata, ICommandProcessor, Container, registerCommands} from '@akala/commands';
//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
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
   export const meta={"name":"pubsub","commands":[{"name":"publish","config":{"fs":{"path":"dist/esm/commands/publish.js","source":"src/commands/publish.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]},"jsonrpc":{"inject":["param.0","param.1"]}}},{"name":"subscribe","config":{"fs":{"path":"dist/esm/commands/subscribe.js","source":"src/commands/subscribe.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]},"jsonrpc":{"inject":["$connectionAsContainer","param.1","param.2"]}}},{"name":"unsubscribe","config":{"fs":{"inject":["param.0","param.1"],"path":"dist/esm/commands/unsubscribe.js","source":"src/commands/unsubscribe.ts"},"":{"inject":["param.0","param.1"]},"jsonrpc":{"inject":["connectionAsContainer","param.0"]}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
        const container = new Container<void>("commands", void 0);
        registerCommands(meta.commands, processor, container);
        return container as container & Container<void>;
    }
}

export { commands as default };