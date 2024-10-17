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
		dispatch (cmd:'add-loader', ...args: [Argument0<typeof import('./commands/add-loader.js').default>, Argument1<typeof import('./commands/add-loader.js').default>]): ReturnType<typeof import('./commands/add-loader.js').default>
		dispatch (cmd:'compile', ...args: []): ReturnType<typeof import('./commands/compile.js').default>
	}
	export interface proxy 
	{
		'add-loader'(...args: [Argument0<typeof import('./commands/add-loader.js').default>, Argument1<typeof import('./commands/add-loader.js').default>]): ReturnType<typeof import('./commands/add-loader.js').default>
		'compile'(...args: []): ReturnType<typeof import('./commands/compile.js').default>
	}
   export const meta={"name":"@akala/client-compiler","commands":[{"name":"add-loader","config":{"fs":{"inject":["param.0","param.1"],"path":"dist/esm/commands/add-loader.js","source":"src/commands/add-loader.ts"},"":{"inject":["param.0","param.1"]},"cli":{"inject":["options.type","options.path"],"usage":"add-loader <type> <path>","options":{"path":{"normalize":true}}}}},{"name":"compile","config":{"fs":{"inject":["param"],"path":"dist/esm/commands/compile.js","source":"src/commands/compile.ts"},"":{"inject":["param"]},"cli":{"usage":"compile [...entrypoints]","inject":["context.state","options.entrypoints"],"options":{"entrypoints":{"normalize":true}}}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("commands", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { commands as default };