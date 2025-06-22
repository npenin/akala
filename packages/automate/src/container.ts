//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		dispatch (cmd:'disable-schedule', ...args: [Argument0<typeof import('./commands/disable-schedule.ts').default>]): ReturnType<typeof import('./commands/disable-schedule.ts').default>
		dispatch (cmd:'enable-schedule', ...args: [Argument0<typeof import('./commands/enable-schedule.ts').default>]): ReturnType<typeof import('./commands/enable-schedule.ts').default>
		dispatch (cmd:'list', ...args: []): ReturnType<typeof import('./commands/list.ts').default>
		dispatch (cmd:'load', ...args: [Argument1<typeof import('./commands/load.ts').default>, Argument2<typeof import('./commands/load.ts').default>]): ReturnType<typeof import('./commands/load.ts').default>
		dispatch (cmd:'register-loader', ...args: [Argument0<typeof import('./commands/register-loader.ts').default>]): ReturnType<typeof import('./commands/register-loader.ts').default>
		dispatch (cmd:'register-trigger', ...args: [Argument0<typeof import('./commands/register-trigger.ts').default>, Argument1<typeof import('./commands/register-trigger.ts').default>]): ReturnType<typeof import('./commands/register-trigger.ts').default>
		dispatch (cmd:'start', ...args: [Argument0<typeof import('./commands/start.ts').default>, Argument1<typeof import('./commands/start.ts').default>, Argument2<typeof import('./commands/start.ts').default>]): ReturnType<typeof import('./commands/start.ts').default>
		dispatch (cmd:'unload', ...args: [Argument1<typeof import('./commands/unload.ts').default>]): ReturnType<typeof import('./commands/unload.ts').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		'disable-schedule'(...args: [Argument0<typeof import('./commands/disable-schedule.ts').default>]): ReturnType<typeof import('./commands/disable-schedule.ts').default>
		'enable-schedule'(...args: [Argument0<typeof import('./commands/enable-schedule.ts').default>]): ReturnType<typeof import('./commands/enable-schedule.ts').default>
		'list'(...args: []): ReturnType<typeof import('./commands/list.ts').default>
		'load'(...args: [Argument1<typeof import('./commands/load.ts').default>, Argument2<typeof import('./commands/load.ts').default>]): ReturnType<typeof import('./commands/load.ts').default>
		'register-loader'(...args: [Argument0<typeof import('./commands/register-loader.ts').default>]): ReturnType<typeof import('./commands/register-loader.ts').default>
		'register-trigger'(...args: [Argument0<typeof import('./commands/register-trigger.ts').default>, Argument1<typeof import('./commands/register-trigger.ts').default>]): ReturnType<typeof import('./commands/register-trigger.ts').default>
		'start'(...args: [Argument0<typeof import('./commands/start.ts').default>, Argument1<typeof import('./commands/start.ts').default>, Argument2<typeof import('./commands/start.ts').default>]): ReturnType<typeof import('./commands/start.ts').default>
		'unload'(...args: [Argument1<typeof import('./commands/unload.ts').default>]): ReturnType<typeof import('./commands/unload.ts').default>
	}
   export const meta={"name":"@akala/automate","commands":[{"name":"$init","config":{"fs":{"inject":["pm","params.0"],"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts"},"":{"inject":["pm","params.0"]},"cli":{"usage":"$init [persist]","inject":["pm","options.persist"],"options":{"persist":{"normalize":true}}}}},{"name":"disable-schedule","config":{"fs":{"path":"dist/esm/commands/disable-schedule.js","source":"src/commands/disable-schedule.ts","inject":["params.0"]},"cli":{"inject":["params.0"]},"":{"inject":[]}}},{"name":"enable-schedule","config":{"fs":{"path":"dist/esm/commands/enable-schedule.js","source":"src/commands/enable-schedule.ts","inject":["params.0"]},"cli":{"inject":["params.0"]},"":{"inject":[]}}},{"name":"list","config":{"fs":{"path":"dist/esm/commands/list.js","source":"src/commands/list.ts","inject":[]},"":{"inject":[]},"cli":{"inject":[]}}},{"name":"load","config":{"fs":{"inject":["$container","params.0","params.1"],"path":"dist/esm/commands/load.js","source":"src/commands/load.ts"},"":{"inject":["$container","params.0","params.1"]},"cli":{"usage":"load <name> <file>","inject":["dummy","options.name","options.file"],"options":{"file":{"normalize":true}}}}},{"name":"register-loader","config":{"fs":{"inject":["params.0"],"path":"dist/esm/commands/register-loader.js","source":"src/commands/register-loader.ts"},"":{"inject":["params.0","params.1"]},"jsonrpc":{"inject":["params.0","connectionAsContainer"]}}},{"name":"register-trigger","config":{"fs":{"path":"dist/esm/commands/register-trigger.js","source":"src/commands/register-trigger.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]},"jsonrpc":{"inject":["params.0","connectionAsContainer"]}}},{"name":"start","config":{"fs":{"path":"dist/esm/commands/start.js","source":"src/commands/start.ts","inject":["params.0","params.1","params.2"]},"":{"inject":["params.0","params.1","params.2"]},"cli":{"inject":["params.0","context","options.wait"],"options":{"wait":{"aliases":["w"]}}}}},{"name":"unload","config":{"fs":{"inject":["$container","params.0"],"path":"dist/esm/commands/unload.js","source":"src/commands/unload.ts"},"":{"inject":["$container","params.0"]},"cli":{"usage":"unload <name>","inject":["dummy","options.name"],"options":{"file":{"normalize":true}}}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };