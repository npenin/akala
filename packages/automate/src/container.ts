/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'enqueue', ...args: [Argument0<typeof import('./commands/start').default>, Argument1<typeof import('./commands/start').default>, Argument2<typeof import('./commands/start').default>]): ReturnType<typeof import('./commands/start').default>
		dispatch (cmd:'list', ...args: []): ReturnType<typeof import('./commands/list').default>
		dispatch (cmd:'load', ...args: [Argument1<typeof import('./commands/load').default>, Argument2<typeof import('./commands/load').default>]): ReturnType<typeof import('./commands/load').default>
		dispatch (cmd:'register-loader', ...args: [Argument0<typeof import('./commands/register-loader').default>]): ReturnType<typeof import('./commands/register-loader').default>
		dispatch (cmd:'register-trigger', ...args: [Argument0<typeof import('./commands/register-trigger').default>, Argument1<typeof import('./commands/register-trigger').default>]): ReturnType<typeof import('./commands/register-trigger').default>
		dispatch (cmd:'unload', ...args: [Argument1<typeof import('./commands/unload').default>]): ReturnType<typeof import('./commands/unload').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		'enqueue'(...args: [Argument0<typeof import('./commands/start').default>, Argument1<typeof import('./commands/start').default>, Argument2<typeof import('./commands/start').default>]): ReturnType<typeof import('./commands/start').default>
		'list'(...args: []): ReturnType<typeof import('./commands/list').default>
		'load'(...args: [Argument1<typeof import('./commands/load').default>, Argument2<typeof import('./commands/load').default>]): ReturnType<typeof import('./commands/load').default>
		'register-loader'(...args: [Argument0<typeof import('./commands/register-loader').default>]): ReturnType<typeof import('./commands/register-loader').default>
		'register-trigger'(...args: [Argument0<typeof import('./commands/register-trigger').default>, Argument1<typeof import('./commands/register-trigger').default>]): ReturnType<typeof import('./commands/register-trigger').default>
		'unload'(...args: [Argument1<typeof import('./commands/unload').default>]): ReturnType<typeof import('./commands/unload').default>
	}
}

export { commands as default };