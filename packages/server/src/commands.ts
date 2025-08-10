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
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./commands/$init.ts').default>, Argument1<typeof import('./commands/$init.ts').default>, Argument2<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		dispatch (cmd:'mode', ...args: [Argument0<typeof import('./commands/mode.ts').default>]): ReturnType<typeof import('./commands/mode.ts').default>
		dispatch (cmd:'remote-container', ...args: [Argument1<typeof import('./commands/remote-container.ts').default>, Argument2<typeof import('./commands/remote-container.ts').default>]): ReturnType<typeof import('./commands/remote-container.ts').default>
		dispatch (cmd:'remote-route', ...args: [Argument0<typeof import('./commands/remote-route.ts').default>, Argument1<typeof import('./commands/remote-route.ts').default>, Argument2<typeof import('./commands/remote-route.ts').default>]): ReturnType<typeof import('./commands/remote-route.ts').default>
		dispatch (cmd:'remove-asset', ...args: [Argument0<typeof import('./commands/remove-asset.ts').default>, Argument1<typeof import('./commands/remove-asset.ts').default>]): ReturnType<typeof import('./commands/remove-asset.ts').default>
		dispatch (cmd:'route', ...args: [Argument0<typeof import('./commands/route.ts').default>, Argument1<typeof import('./commands/route.ts').default>, Argument2<typeof import('./commands/route.ts').default>, Argument3<typeof import('./commands/route.ts').default>]): ReturnType<typeof import('./commands/route.ts').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./commands/$init.ts').default>, Argument1<typeof import('./commands/$init.ts').default>, Argument2<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		'mode'(...args: [Argument0<typeof import('./commands/mode.ts').default>]): ReturnType<typeof import('./commands/mode.ts').default>
		'remote-container'(...args: [Argument1<typeof import('./commands/remote-container.ts').default>, Argument2<typeof import('./commands/remote-container.ts').default>]): ReturnType<typeof import('./commands/remote-container.ts').default>
		'remote-route'(...args: [Argument0<typeof import('./commands/remote-route.ts').default>, Argument1<typeof import('./commands/remote-route.ts').default>, Argument2<typeof import('./commands/remote-route.ts').default>]): ReturnType<typeof import('./commands/remote-route.ts').default>
		'remove-asset'(...args: [Argument0<typeof import('./commands/remove-asset.ts').default>, Argument1<typeof import('./commands/remove-asset.ts').default>]): ReturnType<typeof import('./commands/remove-asset.ts').default>
		'route'(...args: [Argument0<typeof import('./commands/route.ts').default>, Argument1<typeof import('./commands/route.ts').default>, Argument2<typeof import('./commands/route.ts').default>, Argument3<typeof import('./commands/route.ts').default>]): ReturnType<typeof import('./commands/route.ts').default>
	}
   export const meta={"name":"@akala/server","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts","inject":["params.0","params.1","params.2"]},"cli":{"inject":["$container","options","pm"],"options":{"mode":{"needsValue":true}}},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"mode","config":{"fs":{"path":"dist/esm/commands/mode.js","source":"src/commands/mode.ts","inject":["params.0"]},"":{"inject":["params.0"]}}},{"name":"remote-container","config":{"fs":{"inject":["dummy","params.1","params.2"],"path":"dist/esm/commands/remote-container.js","source":"src/commands/remote-container.ts"},"jsonrpc":{"inject":["connectionAsContainer","params.0","params.1"]},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"remote-route","config":{"fs":{"path":"dist/esm/commands/remote-route.js","source":"src/commands/remote-route.ts","inject":["params.0","params.1","params.2"]},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"remove-asset","config":{"fs":{"path":"dist/esm/commands/remove-asset.js","source":"src/commands/remove-asset.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]}}},{"name":"route","config":{"fs":{"path":"dist/esm/commands/route.js","source":"src/commands/route.ts","inject":["params.0","params.1","params.2","params.3"]},"cli":{"usage":"route <route> <path>","inject":["options.route","options.path","options","cwd"],"options":{"get":{"needsValue":false},"use":{"needsValue":false},"pre":{"needsValue":false},"auth":{"needsValue":false},"app":{"needsValue":false},"path":{"needsValue":true,"normalize":true},"route":{"needsValue":true,"normalize":true,"doc":"root path for the route"}}},"":{"inject":["params.0","params.1","params.2","params.3"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };