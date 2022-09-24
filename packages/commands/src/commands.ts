/* eslint-disable @typescript-eslint/no-unused-vars */
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
		dispatch (cmd:'add-script', ...args: [Argument0<typeof import('./cli/add-script').default>, Argument1<typeof import('./cli/add-script').default>, Argument2<typeof import('./cli/add-script').default>, Argument3<typeof import('./cli/add-script').default>]): ReturnType<typeof import('./cli/add-script').default>
		dispatch (cmd:'generate-declaration', ...args: [Argument0<typeof import('./cli/generate-declaration').default>, Argument1<typeof import('./cli/generate-declaration').default>]): ReturnType<typeof import('./cli/generate-declaration').default>
		dispatch (cmd:'generate-metadata', ...args: []): ReturnType<typeof import('./cli/generate-metadata').default>
		dispatch (cmd:'generate', ...args: [Argument0<typeof import('./cli/generate').default>, Argument1<typeof import('./cli/generate').default>, Argument2<typeof import('./cli/generate').default>]): ReturnType<typeof import('./cli/generate').default>
		dispatch (cmd:'implement', ...args: [Argument0<typeof import('./cli/implement').default>, Argument1<typeof import('./cli/implement').default>]): ReturnType<typeof import('./cli/implement').default>
		dispatch (cmd:'register', ...args: [Argument0<typeof import('./cli/register').default>, Argument1<typeof import('./cli/register').default>, Argument2<typeof import('./cli/register').default>]): ReturnType<typeof import('./cli/register').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'command-config', ...args: []): ReturnType<typeof import('./cli/new/command-config').default>
		/** 
		  * create a new command with the given name and destination (if present, cwd otherwise)
		  */
		dispatch (cmd:'command', ...args: []): ReturnType<typeof import('./cli/new/command').default>
		dispatch (cmd:'serve', ...args: []): ReturnType<typeof import('./cli/serve').default>
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
		'add-script'(...args: [Argument0<typeof import('./cli/add-script').default>, Argument1<typeof import('./cli/add-script').default>, Argument2<typeof import('./cli/add-script').default>, Argument3<typeof import('./cli/add-script').default>]): ReturnType<typeof import('./cli/add-script').default>
		'generate-declaration'(...args: [Argument0<typeof import('./cli/generate-declaration').default>, Argument1<typeof import('./cli/generate-declaration').default>]): ReturnType<typeof import('./cli/generate-declaration').default>
		'generate-metadata'(...args: []): ReturnType<typeof import('./cli/generate-metadata').default>
		'generate'(...args: [Argument0<typeof import('./cli/generate').default>, Argument1<typeof import('./cli/generate').default>, Argument2<typeof import('./cli/generate').default>]): ReturnType<typeof import('./cli/generate').default>
		'implement'(...args: [Argument0<typeof import('./cli/implement').default>, Argument1<typeof import('./cli/implement').default>]): ReturnType<typeof import('./cli/implement').default>
		'register'(...args: [Argument0<typeof import('./cli/register').default>, Argument1<typeof import('./cli/register').default>, Argument2<typeof import('./cli/register').default>]): ReturnType<typeof import('./cli/register').default>
		/** 
		  * create a new command configuration (json file) with the given name and destination (if present, cwd otherwise)
		  */
		'command-config'(...args: []): ReturnType<typeof import('./cli/new/command-config').default>
		/** 
		  * create a new command with the given name and destination (if present, cwd otherwise)
		  */
		'command'(...args: []): ReturnType<typeof import('./cli/new/command').default>
		'serve'(...args: []): ReturnType<typeof import('./cli/serve').default>
	}
}

export { cli as default };