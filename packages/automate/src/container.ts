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
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		dispatch (cmd:'disable-schedule', ...args: [Argument0<typeof import('./commands/disable-schedule.js').default>]): ReturnType<typeof import('./commands/disable-schedule.js').default>
		dispatch (cmd:'enable-schedule', ...args: [Argument0<typeof import('./commands/enable-schedule.js').default>]): ReturnType<typeof import('./commands/enable-schedule.js').default>
		dispatch (cmd:'list', ...args: []): ReturnType<typeof import('./commands/list.js').default>
		dispatch (cmd:'load', ...args: [Argument1<typeof import('./commands/load.js').default>, Argument2<typeof import('./commands/load.js').default>]): ReturnType<typeof import('./commands/load.js').default>
		dispatch (cmd:'register-loader', ...args: [Argument0<typeof import('./commands/register-loader.js').default>]): ReturnType<typeof import('./commands/register-loader.js').default>
		dispatch (cmd:'register-trigger', ...args: [Argument0<typeof import('./commands/register-trigger.js').default>, Argument1<typeof import('./commands/register-trigger.js').default>]): ReturnType<typeof import('./commands/register-trigger.js').default>
		dispatch (cmd:'start', ...args: [Argument0<typeof import('./commands/start.js').default>, Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		dispatch (cmd:'unload', ...args: [Argument1<typeof import('./commands/unload.js').default>]): ReturnType<typeof import('./commands/unload.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		'disable-schedule'(...args: [Argument0<typeof import('./commands/disable-schedule.js').default>]): ReturnType<typeof import('./commands/disable-schedule.js').default>
		'enable-schedule'(...args: [Argument0<typeof import('./commands/enable-schedule.js').default>]): ReturnType<typeof import('./commands/enable-schedule.js').default>
		'list'(...args: []): ReturnType<typeof import('./commands/list.js').default>
		'load'(...args: [Argument1<typeof import('./commands/load.js').default>, Argument2<typeof import('./commands/load.js').default>]): ReturnType<typeof import('./commands/load.js').default>
		'register-loader'(...args: [Argument0<typeof import('./commands/register-loader.js').default>]): ReturnType<typeof import('./commands/register-loader.js').default>
		'register-trigger'(...args: [Argument0<typeof import('./commands/register-trigger.js').default>, Argument1<typeof import('./commands/register-trigger.js').default>]): ReturnType<typeof import('./commands/register-trigger.js').default>
		'start'(...args: [Argument0<typeof import('./commands/start.js').default>, Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		'unload'(...args: [Argument1<typeof import('./commands/unload.js').default>]): ReturnType<typeof import('./commands/unload.js').default>
	}
   export const meta={"name":"@akala/automate","commands":[{"name":"$init","config":{"fs":{"inject":["pm","param.0"],"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts"},"":{"inject":["pm","param.0"]},"cli":{"usage":"$init [persist]","inject":["pm","options.persist"],"options":{"persist":{"normalize":true}}}}},{"name":"disable-schedule","config":{"fs":{"path":"dist/esm/commands/disable-schedule.js","source":"src/commands/disable-schedule.ts","inject":["param.0"]},"cli":{"inject":["param.0"]},"":{"inject":[]}}},{"name":"enable-schedule","config":{"fs":{"path":"dist/esm/commands/enable-schedule.js","source":"src/commands/enable-schedule.ts","inject":["param.0"]},"cli":{"inject":["param.0"]},"":{"inject":[]}}},{"name":"list","config":{"fs":{"path":"dist/esm/commands/list.js","source":"src/commands/list.ts","inject":[]},"":{"inject":[]},"cli":{"inject":[]}}},{"name":"load","config":{"fs":{"inject":["$container","param.0","param.1"],"path":"dist/esm/commands/load.js","source":"src/commands/load.ts"},"":{"inject":["$container","param.0","param.1"]},"cli":{"usage":"load <name> <file>","inject":["dummy","options.name","options.file"],"options":{"file":{"normalize":true}}}}},{"name":"register-loader","config":{"fs":{"inject":["param.0"],"path":"dist/esm/commands/register-loader.js","source":"src/commands/register-loader.ts"},"":{"inject":["param.0","param.1"]},"jsonrpc":{"inject":["param.0","connectionAsContainer"]}}},{"name":"register-trigger","config":{"fs":{"path":"dist/esm/commands/register-trigger.js","source":"src/commands/register-trigger.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]},"jsonrpc":{"inject":["param.0","connectionAsContainer"]}}},{"name":"start","config":{"fs":{"path":"dist/esm/commands/start.js","source":"src/commands/start.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]},"cli":{"inject":["param.0","context","options.wait"],"options":{"wait":{"aliases":["w"]}}}}},{"name":"unload","config":{"fs":{"inject":["$container","param.0"],"path":"dist/esm/commands/unload.js","source":"src/commands/unload.ts"},"":{"inject":["$container","param.0"]},"cli":{"usage":"unload <name>","inject":["dummy","options.name"],"options":{"file":{"normalize":true}}}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
        const container = new Container<void>("commands", void 0);
        registerCommands(meta.commands, processor, container);
        return container as container & Container<void>;
    }
}

export { commands as default };