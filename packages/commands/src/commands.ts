//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import {Metadata, ICommandProcessor, Container, registerCommands} from "@akala/commands";
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace cli
{
	export interface container 
	{
		/** 
		  * Adds scripts generate (and generate-metadata if `typescriptFile` is provided) to the package.json in cwd.
		  * if `name` is provided, generated scripts names are suffixed with the provided name
		  * @typedef args0 - name of the container to be used
		  * @typedef args1 - path to the folder containing the commands
		  * @typedef args2 - path to the metadata file to get generated
		  * @param {[args0, args1, args2]} args
		  */
		dispatch (cmd:'add-script', ...args: [Argument0<typeof import('./cli/add-script.ts').default>, Argument1<typeof import('./cli/add-script.ts').default>, Argument2<typeof import('./cli/add-script.ts').default>, Argument3<typeof import('./cli/add-script.ts').default>]): ReturnType<typeof import('./cli/add-script.ts').default>
		dispatch (cmd:'generate', ...args: [Argument0<typeof import('./cli/generate.ts').default>, Argument1<typeof import('./cli/generate.ts').default>, Argument2<typeof import('./cli/generate.ts').default>, Argument3<typeof import('./cli/generate.ts').default>]): ReturnType<typeof import('./cli/generate.ts').default>
		dispatch (cmd:'generate-declaration', ...args: [Argument0<typeof import('./cli/generate-declaration.ts').default>, Argument1<typeof import('./cli/generate-declaration.ts').default>, Argument2<typeof import('./cli/generate-declaration.ts').default>]): ReturnType<typeof import('./cli/generate-declaration.ts').default>
		dispatch (cmd:'generate-metadata', ...args: [Argument0<typeof import('./cli/generate-metadata.ts').default>, Argument1<typeof import('./cli/generate-metadata.ts').default>, Argument2<typeof import('./cli/generate-metadata.ts').default>, Argument3<typeof import('./cli/generate-metadata.ts').default>]): ReturnType<typeof import('./cli/generate-metadata.ts').default>
		dispatch (cmd:'generate-openapi', ...args: [Argument0<typeof import('./cli/generate-openapi.ts').default>, Argument1<typeof import('./cli/generate-openapi.ts').default>, Argument2<typeof import('./cli/generate-openapi.ts').default>]): ReturnType<typeof import('./cli/generate-openapi.ts').default>
		dispatch (cmd:'generate-schema', ...args: [Argument0<typeof import('./cli/generate-schema.ts').default>, Argument1<typeof import('./cli/generate-schema.ts').default>, Argument2<typeof import('./cli/generate-schema.ts').default>]): ReturnType<typeof import('./cli/generate-schema.ts').default>
		dispatch (cmd:'generate-ts-from-schema', ...args: [Argument0<typeof import('./cli/generate-ts-from-schema.ts').default>, Argument1<typeof import('./cli/generate-ts-from-schema.ts').default>, Argument2<typeof import('./cli/generate-ts-from-schema.ts').default>]): ReturnType<typeof import('./cli/generate-ts-from-schema.ts').default>
		dispatch (cmd:'implement', ...args: [Argument0<typeof import('./cli/implement.ts').default>, Argument1<typeof import('./cli/implement.ts').default>]): ReturnType<typeof import('./cli/implement.ts').default>
		dispatch (cmd:'merge-coverage', ...args: [Argument0<typeof import('./cli/merge-coverage.ts').default>, Argument1<typeof import('./cli/merge-coverage.ts').default>]): ReturnType<typeof import('./cli/merge-coverage.ts').default>
		/** 
		  * create a new command with the given `name` and `destination` (if present, cwd otherwise)
		  */
		dispatch (cmd:'new.command', ...args: [Argument0<typeof import('./cli/new/command.ts').default>, Argument1<typeof import('./cli/new/command.ts').default>, Argument2<typeof import('./cli/new/command.ts').default>, Argument3<typeof import('./cli/new/command.ts').default>]): ReturnType<typeof import('./cli/new/command.ts').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'new.command-config', ...args: [Argument0<typeof import('./cli/new/command-config.ts').default>, Argument1<typeof import('./cli/new/command-config.ts').default>, Argument2<typeof import('./cli/new/command-config.ts').default>]): ReturnType<typeof import('./cli/new/command-config.ts').default>
		/** 
		  * create a new module with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'new.module', ...args: [Argument0<typeof import('./cli/new/module.ts').default>, Argument1<typeof import('./cli/new/module.ts').default>]): ReturnType<typeof import('./cli/new/module.ts').default>
		/** 
		  * create a new akala plugin at the given `source` (if present, `target` otherwise)
		  */
		dispatch (cmd:'new.plugin', ...args: [Argument0<typeof import('./cli/new/plugin.ts').default>, Argument1<typeof import('./cli/new/plugin.ts').default>, Argument2<typeof import('./cli/new/plugin.ts').default>]): ReturnType<typeof import('./cli/new/plugin.ts').default>
		dispatch (cmd:'openapi', ...args: [Argument0<typeof import('./cli/openapi.ts').default>, Argument1<typeof import('./cli/openapi.ts').default>]): ReturnType<typeof import('./cli/openapi.ts').default>
		dispatch (cmd:'register', ...args: [Argument0<typeof import('./cli/register.ts').default>, Argument1<typeof import('./cli/register.ts').default>, Argument2<typeof import('./cli/register.ts').default>]): ReturnType<typeof import('./cli/register.ts').default>
		dispatch (cmd:'serve', ...args: [Argument0<typeof import('./cli/serve.ts').default>, Argument1<typeof import('./cli/serve.ts').default>, Argument2<typeof import('./cli/serve.ts').default>]): ReturnType<typeof import('./cli/serve.ts').default>
	}
	export interface proxy 
	{
		/** 
		  * Adds scripts generate (and generate-metadata if `typescriptFile` is provided) to the package.json in cwd.
		  * if `name` is provided, generated scripts names are suffixed with the provided name
		  * @typedef args0 - name of the container to be used
		  * @typedef args1 - path to the folder containing the commands
		  * @typedef args2 - path to the metadata file to get generated
		  * @param {[args0, args1, args2]} args
		  */
		'add-script'(...args: [Argument0<typeof import('./cli/add-script.ts').default>, Argument1<typeof import('./cli/add-script.ts').default>, Argument2<typeof import('./cli/add-script.ts').default>, Argument3<typeof import('./cli/add-script.ts').default>]): ReturnType<typeof import('./cli/add-script.ts').default>
		'generate'(...args: [Argument0<typeof import('./cli/generate.ts').default>, Argument1<typeof import('./cli/generate.ts').default>, Argument2<typeof import('./cli/generate.ts').default>, Argument3<typeof import('./cli/generate.ts').default>]): ReturnType<typeof import('./cli/generate.ts').default>
		'generate-declaration'(...args: [Argument0<typeof import('./cli/generate-declaration.ts').default>, Argument1<typeof import('./cli/generate-declaration.ts').default>, Argument2<typeof import('./cli/generate-declaration.ts').default>]): ReturnType<typeof import('./cli/generate-declaration.ts').default>
		'generate-metadata'(...args: [Argument0<typeof import('./cli/generate-metadata.ts').default>, Argument1<typeof import('./cli/generate-metadata.ts').default>, Argument2<typeof import('./cli/generate-metadata.ts').default>, Argument3<typeof import('./cli/generate-metadata.ts').default>]): ReturnType<typeof import('./cli/generate-metadata.ts').default>
		'generate-openapi'(...args: [Argument0<typeof import('./cli/generate-openapi.ts').default>, Argument1<typeof import('./cli/generate-openapi.ts').default>, Argument2<typeof import('./cli/generate-openapi.ts').default>]): ReturnType<typeof import('./cli/generate-openapi.ts').default>
		'generate-schema'(...args: [Argument0<typeof import('./cli/generate-schema.ts').default>, Argument1<typeof import('./cli/generate-schema.ts').default>, Argument2<typeof import('./cli/generate-schema.ts').default>]): ReturnType<typeof import('./cli/generate-schema.ts').default>
		'generate-ts-from-schema'(...args: [Argument0<typeof import('./cli/generate-ts-from-schema.ts').default>, Argument1<typeof import('./cli/generate-ts-from-schema.ts').default>, Argument2<typeof import('./cli/generate-ts-from-schema.ts').default>]): ReturnType<typeof import('./cli/generate-ts-from-schema.ts').default>
		'implement'(...args: [Argument0<typeof import('./cli/implement.ts').default>, Argument1<typeof import('./cli/implement.ts').default>]): ReturnType<typeof import('./cli/implement.ts').default>
		'merge-coverage'(...args: [Argument0<typeof import('./cli/merge-coverage.ts').default>, Argument1<typeof import('./cli/merge-coverage.ts').default>]): ReturnType<typeof import('./cli/merge-coverage.ts').default>
		/** 
		  * create a new command with the given `name` and `destination` (if present, cwd otherwise)
		  */
		'new.command'(...args: [Argument0<typeof import('./cli/new/command.ts').default>, Argument1<typeof import('./cli/new/command.ts').default>, Argument2<typeof import('./cli/new/command.ts').default>, Argument3<typeof import('./cli/new/command.ts').default>]): ReturnType<typeof import('./cli/new/command.ts').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		'new.command-config'(...args: [Argument0<typeof import('./cli/new/command-config.ts').default>, Argument1<typeof import('./cli/new/command-config.ts').default>, Argument2<typeof import('./cli/new/command-config.ts').default>]): ReturnType<typeof import('./cli/new/command-config.ts').default>
		/** 
		  * create a new module with the given name and destination (if present, cwd otherwise)
		  */
		'new.module'(...args: [Argument0<typeof import('./cli/new/module.ts').default>, Argument1<typeof import('./cli/new/module.ts').default>]): ReturnType<typeof import('./cli/new/module.ts').default>
		/** 
		  * create a new akala plugin at the given `source` (if present, `target` otherwise)
		  */
		'new.plugin'(...args: [Argument0<typeof import('./cli/new/plugin.ts').default>, Argument1<typeof import('./cli/new/plugin.ts').default>, Argument2<typeof import('./cli/new/plugin.ts').default>]): ReturnType<typeof import('./cli/new/plugin.ts').default>
		'openapi'(...args: [Argument0<typeof import('./cli/openapi.ts').default>, Argument1<typeof import('./cli/openapi.ts').default>]): ReturnType<typeof import('./cli/openapi.ts').default>
		'register'(...args: [Argument0<typeof import('./cli/register.ts').default>, Argument1<typeof import('./cli/register.ts').default>, Argument2<typeof import('./cli/register.ts').default>]): ReturnType<typeof import('./cli/register.ts').default>
		'serve'(...args: [Argument0<typeof import('./cli/serve.ts').default>, Argument1<typeof import('./cli/serve.ts').default>, Argument2<typeof import('./cli/serve.ts').default>]): ReturnType<typeof import('./cli/serve.ts').default>
	}
   export const meta={"name":"cli","commands":[{"name":"add-script","config":{"fs":{"path":"dist/esm/cli/add-script.js","source":"src/cli/add-script.ts","inject":["params.0","params.1","params.2","params.3"]},"":{"inject":["params.0","params.1","params.2","params.3"]},"cli":{"inject":["options.name","options.commands","options.metadataFile","options.typescriptFile"],"usage":"add-script <commands> [typescriptFile] [metadataFile]","options":{"name":{"needsValue":true},"commands":{"normalize":true}}},"doc":{"description":"Adds scripts generate (and generate-metadata if `typescriptFile` is provided) to the package.json in cwd.\nif `name` is provided, generated scripts names are suffixed with the provided name","inject":["name of the container to be used","path to the folder containing the commands","path to the metadata file to get generated"]}}},{"name":"generate","config":{"fs":{"path":"dist/esm/cli/generate.js","source":"src/cli/generate.ts","inject":["params.0","params.1","params.2","params.3"]},"":{"inject":["params.0","params.1","params.2","params.3"]},"cli":{"inject":["options","params.0","options.name","params.1"],"options":{"name":{"needsValue":true},"recursive":{"aliases":["R"],"doc":"instructs the discovery process to analyze sub folders"},"flatten":{"aliases":["f"],"doc":"instructs the discovery process to ignore sub folder _names_ when generating commands"}}}}},{"name":"generate-declaration","config":{"fs":{"path":"dist/esm/cli/generate-declaration.js","source":"src/cli/generate-declaration.ts","inject":["params.0","params.1","params.2"]},"cli":{"inject":["options.name","params.0","params.1"]},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"generate-metadata","config":{"fs":{"path":"dist/esm/cli/generate-metadata.js","source":"src/cli/generate-metadata.ts","inject":["params.0","params.1","params.2","params.3"]},"cli":{"inject":["options.name","options.commandPath","options.output","options"],"usage":"generate-metadata [commandPath] [output]","options":{"name":{"needsValue":true},"noStandalone":{"needsValue":false,"aliases":["no-standalone"]},"noContainer":{"needsValue":false,"aliases":["no-container"]},"noProxy":{"needsValue":false,"aliases":["no-proxy"]},"noMetadata":{"needsValue":false,"aliases":["no-metadata"]}}},"":{"inject":["params.0","params.1","params.2","params.3"]}}},{"name":"generate-openapi","config":{"fs":{"path":"dist/esm/cli/generate-openapi.js","source":"src/cli/generate-openapi.ts","inject":["params.0","params.1","params.2"]},"cli":{"inject":["options.commandPath","options.name","options.output","options"],"usage":"generate-openapi [commandPath] [output]","options":{"name":{"needsValue":true}}},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"generate-schema","config":{"fs":{"path":"dist/esm/cli/generate-schema.js","source":"src/cli/generate-schema.ts","inject":["params.0","params.1","params.2"]},"cli":{"inject":["options.commandPath","options.name","options.output","options"],"usage":"generate-schema [commandPath] [output]","options":{"name":{"needsValue":true}}},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"generate-ts-from-schema","config":{"fs":{"path":"dist/esm/cli/generate-ts-from-schema.js","source":"src/cli/generate-ts-from-schema.ts","inject":["params.0","params.1","params.2"]},"cli":{"inject":["options.schemaURI","options.name","options.output","options"],"usage":"generate-ts <schemaURI> <name> [output]","options":{"schemaURI":{"needsValue":true},"name":{"needsValue":true}}},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"implement","config":{"fs":{"path":"dist/esm/cli/implement.js","source":"src/cli/implement.ts","inject":["params.0","params.1"]},"":{"inject":["params.0","params.1"]},"cli":{"usage":"implement <commands> <destination>","inject":["options.commands","options.destination","options"],"options":{"destination":{"normalize":true},"force":{"aliases":["f"]}}}}},{"name":"merge-coverage","config":{"fs":{"inject":["params.0","params.1"],"path":"dist/esm/cli/merge-coverage.js","source":"src/cli/merge-coverage.ts"},"":{"inject":["params.0","params.1"]},"cli":{"usage":"merge-coverage <inputGlob> <output>","inject":["options.inputGlob","options.output"]}}},{"name":"new.command","config":{"fs":{"path":"dist/esm/cli/new/command.js","source":"src/cli/new/command.ts","inject":["params.0","params.1","params.2","params.3"]},"cli":{"usage":"cmd <name> [destination]","options":{"force":{"aliases":["f"]},"destination":{"normalize":true}},"inject":["options.name","options","options.destination"]},"doc":{"description":"create a new command with the given `name` and `destination` (if present, cwd otherwise)"},"":{"inject":["params.0","params.1","params.2","params.3"]}}},{"name":"new.command-config","config":{"fs":{"path":"dist/esm/cli/new/command-config.js","source":"src/cli/new/command-config.ts","inject":["params.0","params.1","params.2"]},"cli":{"usage":"cc <name> [destination]","options":{"force":{"aliases":["f"]}},"inject":["options.name","options","options.destination"]},"doc":{"description":"create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)"},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"new.module","config":{"fs":{"path":"dist/esm/cli/new/module.js","source":"src/cli/new/module.ts","inject":["params.0","params.1"]},"cli":{"usage":"module <name> [destination]","options":{"force":{"aliases":["f"]},"destination":{"normalize":true},"name":{"doc":"is the name of the module/folder that will get created in `destination`"}},"inject":["options.name","options.destination"]},"jsonrpc":{"inject":["params.0.name","params.0.destination"]},"doc":{"description":"create a new module with the given name and destination (if present, cwd otherwise)"},"schema":{"inject":[{"type":"string"},{"type":"string"}]},"mcp":{"type":"tool","inject":{"type":"object","properties":{"name":{"type":"string"},"destination":{"type":"string"}}}},"":{"inject":["params.0","params.1"]}}},{"name":"new.plugin","config":{"fs":{"path":"dist/esm/cli/new/plugin.js","source":"src/cli/new/plugin.ts","inject":["params.0","params.1","params.2"]},"cli":{"usage":"plugin <target> [source]","options":{"force":{"aliases":["f"]},"source":{"normalize":true,"default":"./src/akala.mts"},"destination":{"normalize":true,"default":"./dist/akala.mjs"}},"inject":["options.name","options","options.destination"]},"doc":{"description":"create a new akala plugin at the given `source` (if present, `target` otherwise)"},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"openapi","config":{"fs":{"path":"dist/esm/cli/openapi.js","source":"src/cli/openapi.ts","inject":["params.0","params.1"]},"cli":{"inject":["options.openAPIUri","options.outputFile"],"usage":"openapi <openAPIUri> [outputFile]","options":{"openAPIUri":{"needsValue":true},"outputFile":{"needsValue":true,"normalize":true}}},"":{"inject":["params.0","params.1"]}}},{"name":"register","config":{"fs":{"path":"dist/esm/cli/register.js","source":"src/cli/register.ts","inject":["params.0","params.1","params.2"]},"":{"inject":["params.0","params.1","params.2"]}}},{"name":"serve","config":{"fs":{"path":"dist/esm/cli/serve.js","source":"src/cli/serve.ts","inject":["params.0","params.1","params.2"]},"":{"inject":["params.0","params.1","params.2"]}}}],"$schema":"https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json"} as Metadata.Container;

   export function connect(processor?:ICommandProcessor) {
            const container = new Container<void>("cli", void 0);
            registerCommands(meta.commands, processor, container);
            return container as container & Container<void>;
        }
}

export { cli as default };