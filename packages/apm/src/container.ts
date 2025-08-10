//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import type {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, type ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace apm
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument0<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		dispatch (cmd:'cache.add', ...args: [Argument0<typeof import('./commands/cache/add.ts').default>, Argument1<typeof import('./commands/cache/add.ts').default>, Argument2<typeof import('./commands/cache/add.ts').default>]): ReturnType<typeof import('./commands/cache/add.ts').default>
		dispatch (cmd:'config.set-registry', ...args: [Argument0<typeof import('./commands/config/set-registry.ts').default>, Argument1<typeof import('./commands/config/set-registry.ts').default>]): ReturnType<typeof import('./commands/config/set-registry.ts').default>
		dispatch (cmd:'install', ...args: [Argument0<typeof import('./commands/install.ts').default>, Argument1<typeof import('./commands/install.ts').default>, Argument2<typeof import('./commands/install.ts').default>, Argument3<typeof import('./commands/install.ts').default>]): ReturnType<typeof import('./commands/install.ts').default>
		dispatch (cmd:'why', ...args: [Argument0<typeof import('./commands/why.ts').default>]): ReturnType<typeof import('./commands/why.ts').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./commands/$init.ts').default>]): ReturnType<typeof import('./commands/$init.ts').default>
		'cache.add'(...args: [Argument0<typeof import('./commands/cache/add.ts').default>, Argument1<typeof import('./commands/cache/add.ts').default>, Argument2<typeof import('./commands/cache/add.ts').default>]): ReturnType<typeof import('./commands/cache/add.ts').default>
		'config.set-registry'(...args: [Argument0<typeof import('./commands/config/set-registry.ts').default>, Argument1<typeof import('./commands/config/set-registry.ts').default>]): ReturnType<typeof import('./commands/config/set-registry.ts').default>
		'install'(...args: [Argument0<typeof import('./commands/install.ts').default>, Argument1<typeof import('./commands/install.ts').default>, Argument2<typeof import('./commands/install.ts').default>, Argument3<typeof import('./commands/install.ts').default>]): ReturnType<typeof import('./commands/install.ts').default>
		'why'(...args: [Argument0<typeof import('./commands/why.ts').default>]): ReturnType<typeof import('./commands/why.ts').default>
	}
   export const meta={"name":"apm","commands":[{"name":"$init","config":{"fs":{"inject":["params.0"],"path":"dist/commands/$init.js","source":"src/commands/$init.ts"},"cli":{"inject":["context"]},"":{"inject":["params.0"]}}},{"name":"cache.add","config":{"fs":{"inject":["params.0","params.1","params.2"],"path":"dist/commands/cache/add.js","source":"src/commands/cache/add.ts"},"cli":{"usage":"add <pkgUrl>","inject":["context.logger","options.pkgUrl","options.force"],"options":{"force":{"aliases":["f"],"needsValue":false}}},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"config.set-registry","config":{"fs":{"path":"dist/commands/config/set-registry.js","source":"src/commands/config/set-registry.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]}}},{"name":"install","config":{"fs":{"inject":["params.0","params.1","params.2","params.3"],"path":"dist/commands/install.js","source":"src/commands/install.ts"},"cli":{"usage":"install [package] [version]","inject":["context.abort.signal","options.package","options.version","options.save"],"options":{"save":{"needsValue":true,"doc":"expected value is true | false | dev | peer | optional | test. Default: true"}}},"":{"inject":["params.0","params.1","params.2","params.3"]}}},{"name":"why","config":{"fs":{"inject":["params.0"],"path":"dist/commands/why.js","source":"src/commands/why.ts"},"cli":{"inject":["options.pkg","context.abort.signal"],"usage":"why <pkg>"},"":{"inject":["params.0"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("apm", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { apm as default };