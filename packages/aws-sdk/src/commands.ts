//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace awsSDK
{
	export interface container 
	{
		dispatch (cmd:'$init-akala', ...args: []): ReturnType<typeof import('./cli/$init-akala.js').default>
		dispatch (cmd:'generate-sdk', ...args: [Argument1<typeof import('./cli/generate-sdk.js').default>, Argument2<typeof import('./cli/generate-sdk.js').default>]): ReturnType<typeof import('./cli/generate-sdk.js').default>
		dispatch (cmd:'generate-tf', ...args: [Argument1<typeof import('./cli/generate-tf.js').default>, Argument2<typeof import('./cli/generate-tf.js').default>]): ReturnType<typeof import('./cli/generate-tf.js').default>
	}
	export interface proxy 
	{
		'$init-akala'(...args: []): ReturnType<typeof import('./cli/$init-akala.js').default>
		'generate-sdk'(...args: [Argument1<typeof import('./cli/generate-sdk.js').default>, Argument2<typeof import('./cli/generate-sdk.js').default>]): ReturnType<typeof import('./cli/generate-sdk.js').default>
		'generate-tf'(...args: [Argument1<typeof import('./cli/generate-tf.js').default>, Argument2<typeof import('./cli/generate-tf.js').default>]): ReturnType<typeof import('./cli/generate-tf.js').default>
	}
   export const meta={"name":"aws-sdk","commands":[{"name":"$init-akala","config":{"fs":{"inject":[],"path":"dist/cli/$init-akala.js","source":"src/cli/$init-akala.ts"},"":{"inject":["containers"]}}},{"name":"generate-sdk","config":{"fs":{"path":"dist/cli/generate-sdk.js","source":"src/cli/generate-sdk.ts","inject":["ignore","param.0","param.1"]},"":{"inject":["$http","param.0","param.1"]},"cli":{"usage":"generate [output] [service]","inject":["$http","options.service","options.output"],"options":{"output":{"normalize":true}}}}},{"name":"generate-tf","config":{"fs":{"path":"dist/cli/generate-tf.js","source":"src/cli/generate-tf.ts","inject":["ignore","param.0","param.1"]},"":{"inject":["$http","param.0","param.1"]},"cli":{"usage":"tf <packagePath> <environment> [containerName]","inject":["context.logger","options.packagePath","options.containerName","options.environment","options.outputPath"],"options":{"packagePath":{"normalize":true,"needsValue":true},"outputPath":{"normalize":true,"needsValue":true},"environment":{"needsValue":true}}}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("awsSDK", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { awsSDK as default };