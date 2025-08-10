//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, type ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace workflow
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./workflow-commands/$init.ts').default>, Argument2<typeof import('./workflow-commands/$init.ts').default>]): ReturnType<typeof import('./workflow-commands/$init.ts').default>
		dispatch (cmd:'process', ...args: [Argument0<typeof import('./workflow-commands/process.ts').default>, Argument1<typeof import('./workflow-commands/process.ts').default>]): ReturnType<typeof import('./workflow-commands/process.ts').default>
		dispatch (cmd:'set-config', ...args: [Argument0<typeof import('./workflow-commands/set-config.ts').default>]): ReturnType<typeof import('./workflow-commands/set-config.ts').default>
		dispatch (cmd:'use', ...args: [Argument1<typeof import('./workflow-commands/use.ts').default>, Argument2<typeof import('./workflow-commands/use.ts').default>]): ReturnType<typeof import('./workflow-commands/use.ts').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./workflow-commands/$init.ts').default>, Argument2<typeof import('./workflow-commands/$init.ts').default>]): ReturnType<typeof import('./workflow-commands/$init.ts').default>
		'process'(...args: [Argument0<typeof import('./workflow-commands/process.ts').default>, Argument1<typeof import('./workflow-commands/process.ts').default>]): ReturnType<typeof import('./workflow-commands/process.ts').default>
		'set-config'(...args: [Argument0<typeof import('./workflow-commands/set-config.ts').default>]): ReturnType<typeof import('./workflow-commands/set-config.ts').default>
		'use'(...args: [Argument1<typeof import('./workflow-commands/use.ts').default>, Argument2<typeof import('./workflow-commands/use.ts').default>]): ReturnType<typeof import('./workflow-commands/use.ts').default>
	}
   export const meta={"name":"workflow","commands":[{"name":"$init","config":{"fs":{"path":"dist/esm/workflow-commands/$init.js","source":"src/workflow-commands/$init.ts","inject":["params.0","pm","params.1"]},"":{"inject":["params.0","pm","params.1"]},"cli":{"inject":["options.name","pm","context"]}}},{"name":"process","config":{"fs":{"inject":["params.0","params.1","$container"],"path":"dist/esm/workflow-commands/process.js","source":"src/workflow-commands/process.ts"},"":{"inject":["params.0","params.1","$container"]},"automate":{"inject":["workflow","inputs","$container"]}}},{"name":"set-config","config":{"fs":{"path":"dist/esm/workflow-commands/set-config.js","source":"src/workflow-commands/set-config.ts","inject":["params.0"]},"":{"inject":["params.0"]}}},{"name":"use","config":{"fs":{"inject":["$container","params.0","params.1"],"path":"dist/esm/workflow-commands/use.js","source":"src/workflow-commands/use.ts"},"":{"inject":["$container","params.0","params.1"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("workflow", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { workflow as default };