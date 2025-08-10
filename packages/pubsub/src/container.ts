//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, type ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'publish', ...args: [Argument0<typeof import('./commands/publish.ts').default>, Argument1<typeof import('./commands/publish.ts').default>]): ReturnType<typeof import('./commands/publish.ts').default>
		dispatch (cmd:'subscribe', ...args: [Argument0<typeof import('./commands/subscribe.ts').default>, Argument1<typeof import('./commands/subscribe.ts').default>, Argument2<typeof import('./commands/subscribe.ts').default>]): ReturnType<typeof import('./commands/subscribe.ts').default>
		dispatch (cmd:'unsubscribe', ...args: [Argument0<typeof import('./commands/unsubscribe.ts').default>, Argument1<typeof import('./commands/unsubscribe.ts').default>]): ReturnType<typeof import('./commands/unsubscribe.ts').default>
	}
	export interface proxy 
	{
		'publish'(...args: [Argument0<typeof import('./commands/publish.ts').default>, Argument1<typeof import('./commands/publish.ts').default>]): ReturnType<typeof import('./commands/publish.ts').default>
		'subscribe'(...args: [Argument0<typeof import('./commands/subscribe.ts').default>, Argument1<typeof import('./commands/subscribe.ts').default>, Argument2<typeof import('./commands/subscribe.ts').default>]): ReturnType<typeof import('./commands/subscribe.ts').default>
		'unsubscribe'(...args: [Argument0<typeof import('./commands/unsubscribe.ts').default>, Argument1<typeof import('./commands/unsubscribe.ts').default>]): ReturnType<typeof import('./commands/unsubscribe.ts').default>
	}
   export const meta={"name":"pubsub","commands":[{"name":"publish","config":{"fs":{"path":"dist/esm/commands/publish.js","source":"src/commands/publish.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]},"jsonrpc":{"inject":["params.0","params.1"]}}},{"name":"subscribe","config":{"fs":{"path":"dist/esm/commands/subscribe.js","source":"src/commands/subscribe.ts","inject":["params.0","params.1","params.2"]},"":{"inject":["params.0","params.1","params.2"]},"jsonrpc":{"inject":["$connectionAsContainer","params.1","params.2"]}}},{"name":"unsubscribe","config":{"fs":{"inject":["params.0","params.1"],"path":"dist/esm/commands/unsubscribe.js","source":"src/commands/unsubscribe.ts"},"":{"inject":["params.0","params.1"]},"jsonrpc":{"inject":["connectionAsContainer","params.0"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };