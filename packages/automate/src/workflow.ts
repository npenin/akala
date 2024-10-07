//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace workflow
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./workflow-commands/$init.js').default>, Argument2<typeof import('./workflow-commands/$init.js').default>]): ReturnType<typeof import('./workflow-commands/$init.js').default>
		dispatch (cmd:'process', ...args: [Argument0<typeof import('./workflow-commands/process.js').default>, Argument1<typeof import('./workflow-commands/process.js').default>]): ReturnType<typeof import('./workflow-commands/process.js').default>
		dispatch (cmd:'set-config', ...args: [Argument0<typeof import('./workflow-commands/set-config.js').default>]): ReturnType<typeof import('./workflow-commands/set-config.js').default>
		dispatch (cmd:'use', ...args: [Argument1<typeof import('./workflow-commands/use.js').default>, Argument2<typeof import('./workflow-commands/use.js').default>]): ReturnType<typeof import('./workflow-commands/use.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./workflow-commands/$init.js').default>, Argument2<typeof import('./workflow-commands/$init.js').default>]): ReturnType<typeof import('./workflow-commands/$init.js').default>
		'process'(...args: [Argument0<typeof import('./workflow-commands/process.js').default>, Argument1<typeof import('./workflow-commands/process.js').default>]): ReturnType<typeof import('./workflow-commands/process.js').default>
		'set-config'(...args: [Argument0<typeof import('./workflow-commands/set-config.js').default>]): ReturnType<typeof import('./workflow-commands/set-config.js').default>
		'use'(...args: [Argument1<typeof import('./workflow-commands/use.js').default>, Argument2<typeof import('./workflow-commands/use.js').default>]): ReturnType<typeof import('./workflow-commands/use.js').default>
	}
   export const meta={"name":"workflow","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/workflow-commands/$init.js","source":"src/workflow-commands/$init.ts","inject":["param.0","pm","param.1"]},"":{"inject":["param.0","pm","param.1"]},"cli":{"inject":["options.name","pm","context"]}}},{"name":"process","config":{"fs":{"inject":["param.0","param.1","$container"],"path":"dist/esm/workflow-commands/process.js","source":"src/workflow-commands/process.ts"},"":{"inject":["param.0","param.1","$container"]},"automate":{"inject":["workflow","inputs","$container"]}}},{"name":"set-config","config":{"fs":{"path":"dist/esm/workflow-commands/set-config.js","source":"src/workflow-commands/set-config.ts","inject":["param.0"]},"":{"inject":["param.0"]}}},{"name":"use","config":{"fs":{"inject":["$container","param.0","param.1"],"path":"dist/esm/workflow-commands/use.js","source":"src/workflow-commands/use.ts"},"":{"inject":["$container","param.0","param.1"]}}}]} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("workflow", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { workflow as default };