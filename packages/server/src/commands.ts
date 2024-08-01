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
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./commands/$init.js').default>, Argument1<typeof import('./commands/$init.js').default>, Argument2<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		dispatch (cmd:'mode', ...args: [Argument0<typeof import('./commands/mode.js').default>]): ReturnType<typeof import('./commands/mode.js').default>
		dispatch (cmd:'remote-container', ...args: [Argument1<typeof import('./commands/remote-container.js').default>, Argument2<typeof import('./commands/remote-container.js').default>]): ReturnType<typeof import('./commands/remote-container.js').default>
		dispatch (cmd:'remote-route', ...args: [Argument0<typeof import('./commands/remote-route.js').default>, Argument1<typeof import('./commands/remote-route.js').default>, Argument2<typeof import('./commands/remote-route.js').default>]): ReturnType<typeof import('./commands/remote-route.js').default>
		dispatch (cmd:'remove-asset', ...args: [Argument0<typeof import('./commands/remove-asset.js').default>, Argument1<typeof import('./commands/remove-asset.js').default>]): ReturnType<typeof import('./commands/remove-asset.js').default>
		dispatch (cmd:'require', ...args: [Argument1<typeof import('./commands/require.js').default>, Argument2<typeof import('./commands/require.js').default>]): ReturnType<typeof import('./commands/require.js').default>
		dispatch (cmd:'route', ...args: [Argument0<typeof import('./commands/route.js').default>, Argument1<typeof import('./commands/route.js').default>, Argument2<typeof import('./commands/route.js').default>, Argument3<typeof import('./commands/route.js').default>]): ReturnType<typeof import('./commands/route.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./commands/$init.js').default>, Argument1<typeof import('./commands/$init.js').default>, Argument2<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		'mode'(...args: [Argument0<typeof import('./commands/mode.js').default>]): ReturnType<typeof import('./commands/mode.js').default>
		'remote-container'(...args: [Argument1<typeof import('./commands/remote-container.js').default>, Argument2<typeof import('./commands/remote-container.js').default>]): ReturnType<typeof import('./commands/remote-container.js').default>
		'remote-route'(...args: [Argument0<typeof import('./commands/remote-route.js').default>, Argument1<typeof import('./commands/remote-route.js').default>, Argument2<typeof import('./commands/remote-route.js').default>]): ReturnType<typeof import('./commands/remote-route.js').default>
		'remove-asset'(...args: [Argument0<typeof import('./commands/remove-asset.js').default>, Argument1<typeof import('./commands/remove-asset.js').default>]): ReturnType<typeof import('./commands/remove-asset.js').default>
		'require'(...args: [Argument1<typeof import('./commands/require.js').default>, Argument2<typeof import('./commands/require.js').default>]): ReturnType<typeof import('./commands/require.js').default>
		'route'(...args: [Argument0<typeof import('./commands/route.js').default>, Argument1<typeof import('./commands/route.js').default>, Argument2<typeof import('./commands/route.js').default>, Argument3<typeof import('./commands/route.js').default>]): ReturnType<typeof import('./commands/route.js').default>
	}
   export const meta={"name":"@akala/server","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/commands/$init.js","source":"src/commands/$init.ts","inject":["param.0","param.1","param.2"]},"cli":{"inject":["$container","options","pm"],"options":{"mode":{"needsValue":true}}},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"mode","config":{"fs":{"path":"dist/esm/commands/mode.js","source":"src/commands/mode.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"remote-container","config":{"fs":{"inject":["dummy","param.1","param.2"],"path":"dist/esm/commands/remote-container.js","source":"src/commands/remote-container.ts"},"jsonrpc":{"inject":["connectionAsContainer","param.0","param.1"]},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"remote-route","config":{"fs":{"path":"dist/esm/commands/remote-route.js","source":"src/commands/remote-route.ts","inject":["param.0","param.1","param.2"]},"":{"inject":["param.0","param.1","param.2"]}}},{"name":"remove-asset","config":{"fs":{"path":"dist/esm/commands/remove-asset.js","source":"src/commands/remove-asset.ts","inject":["param.0","param.1"]},"":{"inject":["param.0","param.1"]}}},{"name":"require","config":{"fs":{"path":"dist/esm/commands/require.js","source":"src/commands/require.ts","inject":["ignore","param.0","param.1"]},"cli":{"inject":["$injector","param.0","cwd"]},"":{"inject":["$injector","param.0","param.1"]}}},{"name":"route","config":{"fs":{"path":"dist/esm/commands/route.js","source":"src/commands/route.ts","inject":["param.0","param.1","param.2","param.3"]},"cli":{"inject":["param.0","param.1","options","cwd"],"options":{"normalize":["param.1","root"],"boolean":["get","use","pre","auth","app"]}},"":{"inject":["param.0","param.1","param.2","param.3"]}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
        const container = new Container<void>("commands", void 0);
        registerCommands(meta.commands, processor, container);
        return container as container & Container<void>;
    }
}

export { commands as default };