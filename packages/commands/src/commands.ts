//eslint-disable-next-line @typescript-eslint/no-unused-vars
//@ts-ignore 6133
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace cli
{
	export interface container 
	{
		/** 
		  * Adds scripts generate (and generate-metadata if `typescriptFile` is present) to the closest package.json
		  * if `name` is provided, generated scripts names are suffixed with the provided name
		  * @typedef args0 - name of the container to be used
		  * @typedef args1 - path to the folder containing the commands
		  * @typedef args2 - path to the metadata file to get generated
		  * @param {[args0, args1, args2]} args
		  */
		dispatch (cmd:'add-script', ...args: [Argument0<typeof import('./cli/add-script.js').default>, Argument1<typeof import('./cli/add-script.js').default>, Argument2<typeof import('./cli/add-script.js').default>, Argument3<typeof import('./cli/add-script.js').default>]): ReturnType<typeof import('./cli/add-script.js').default>
		/** 
		  * create a new command with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'command', ...args: []): ReturnType<typeof import('./cli/new/command.js').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'command-config', ...args: []): ReturnType<typeof import('./cli/new/command-config.js').default>
		dispatch (cmd:'generate', ...args: [Argument0<typeof import('./cli/generate.js').default>, Argument1<typeof import('./cli/generate.js').default>, Argument2<typeof import('./cli/generate.js').default>]): ReturnType<typeof import('./cli/generate.js').default>
		dispatch (cmd:'generate-declaration', ...args: [Argument0<typeof import('./cli/generate-declaration.js').default>, Argument1<typeof import('./cli/generate-declaration.js').default>]): ReturnType<typeof import('./cli/generate-declaration.js').default>
		dispatch (cmd:'generate-metadata', ...args: []): ReturnType<typeof import('./cli/generate-metadata.js').default>
		dispatch (cmd:'generate-openapi', ...args: []): ReturnType<typeof import('./cli/generate-openapi.js').default>
		dispatch (cmd:'implement', ...args: [Argument0<typeof import('./cli/implement.js').default>, Argument1<typeof import('./cli/implement.js').default>]): ReturnType<typeof import('./cli/implement.js').default>
		dispatch (cmd:'local', ...args: [Argument0<typeof import('./cli/local.js').default>]): ReturnType<typeof import('./cli/local.js').default>
		/** 
		  * create a new module with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'module', ...args: []): ReturnType<typeof import('./cli/new/module.js').default>
		dispatch (cmd:'openapi', ...args: [Argument0<typeof import('./cli/openapi.js').default>]): ReturnType<typeof import('./cli/openapi.js').default>
		dispatch (cmd:'register', ...args: [Argument0<typeof import('./cli/register.js').default>, Argument1<typeof import('./cli/register.js').default>, Argument2<typeof import('./cli/register.js').default>]): ReturnType<typeof import('./cli/register.js').default>
		dispatch (cmd:'serve', ...args: []): ReturnType<typeof import('./cli/serve.js').default>
	}
	export interface proxy 
	{
		/** 
		  * Adds scripts generate (and generate-metadata if `typescriptFile` is present) to the closest package.json
		  * if `name` is provided, generated scripts names are suffixed with the provided name
		  * @typedef args0 - name of the container to be used
		  * @typedef args1 - path to the folder containing the commands
		  * @typedef args2 - path to the metadata file to get generated
		  * @param {[args0, args1, args2]} args
		  */
		'add-script'(...args: [Argument0<typeof import('./cli/add-script.js').default>, Argument1<typeof import('./cli/add-script.js').default>, Argument2<typeof import('./cli/add-script.js').default>, Argument3<typeof import('./cli/add-script.js').default>]): ReturnType<typeof import('./cli/add-script.js').default>
		/** 
		  * create a new command with the given name and destination (if present, cwd otherwise)
		  */
		'command'(...args: []): ReturnType<typeof import('./cli/new/command.js').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		'command-config'(...args: []): ReturnType<typeof import('./cli/new/command-config.js').default>
		'generate'(...args: [Argument0<typeof import('./cli/generate.js').default>, Argument1<typeof import('./cli/generate.js').default>, Argument2<typeof import('./cli/generate.js').default>]): ReturnType<typeof import('./cli/generate.js').default>
		'generate-declaration'(...args: [Argument0<typeof import('./cli/generate-declaration.js').default>, Argument1<typeof import('./cli/generate-declaration.js').default>]): ReturnType<typeof import('./cli/generate-declaration.js').default>
		'generate-metadata'(...args: []): ReturnType<typeof import('./cli/generate-metadata.js').default>
		'generate-openapi'(...args: []): ReturnType<typeof import('./cli/generate-openapi.js').default>
		'implement'(...args: [Argument0<typeof import('./cli/implement.js').default>, Argument1<typeof import('./cli/implement.js').default>]): ReturnType<typeof import('./cli/implement.js').default>
		'local'(...args: [Argument0<typeof import('./cli/local.js').default>]): ReturnType<typeof import('./cli/local.js').default>
		/** 
		  * create a new module with the given name and destination (if present, cwd otherwise)
		  */
		'module'(...args: []): ReturnType<typeof import('./cli/new/module.js').default>
		'openapi'(...args: [Argument0<typeof import('./cli/openapi.js').default>]): ReturnType<typeof import('./cli/openapi.js').default>
		'register'(...args: [Argument0<typeof import('./cli/register.js').default>, Argument1<typeof import('./cli/register.js').default>, Argument2<typeof import('./cli/register.js').default>]): ReturnType<typeof import('./cli/register.js').default>
		'serve'(...args: []): ReturnType<typeof import('./cli/serve.js').default>
	}
}

export { cli as default };