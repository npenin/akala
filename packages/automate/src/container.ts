//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		dispatch (cmd:'disable-schedule', ...args: [Argument0<typeof import('./commands/disable-schedule.js').default>]): ReturnType<typeof import('./commands/disable-schedule.js').default>
		dispatch (cmd:'enable-schedule', ...args: [Argument0<typeof import('./commands/enable-schedule.js').default>]): ReturnType<typeof import('./commands/enable-schedule.js').default>
		dispatch (cmd:'list', ...args: []): ReturnType<typeof import('./commands/list.js').default>
		dispatch (cmd:'load', ...args: [Argument1<typeof import('./commands/load.js').default>, Argument2<typeof import('./commands/load.js').default>]): ReturnType<typeof import('./commands/load.js').default>
		dispatch (cmd:'register-loader', ...args: [Argument0<typeof import('./commands/register-loader.js').default>]): ReturnType<typeof import('./commands/register-loader.js').default>
		dispatch (cmd:'register-trigger', ...args: [Argument0<typeof import('./commands/register-trigger.js').default>, Argument1<typeof import('./commands/register-trigger.js').default>]): ReturnType<typeof import('./commands/register-trigger.js').default>
		dispatch (cmd:'start', ...args: [Argument0<typeof import('./commands/start.js').default>, Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		dispatch (cmd:'unload', ...args: [Argument1<typeof import('./commands/unload.js').default>]): ReturnType<typeof import('./commands/unload.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		'disable-schedule'(...args: [Argument0<typeof import('./commands/disable-schedule.js').default>]): ReturnType<typeof import('./commands/disable-schedule.js').default>
		'enable-schedule'(...args: [Argument0<typeof import('./commands/enable-schedule.js').default>]): ReturnType<typeof import('./commands/enable-schedule.js').default>
		'list'(...args: []): ReturnType<typeof import('./commands/list.js').default>
		'load'(...args: [Argument1<typeof import('./commands/load.js').default>, Argument2<typeof import('./commands/load.js').default>]): ReturnType<typeof import('./commands/load.js').default>
		'register-loader'(...args: [Argument0<typeof import('./commands/register-loader.js').default>]): ReturnType<typeof import('./commands/register-loader.js').default>
		'register-trigger'(...args: [Argument0<typeof import('./commands/register-trigger.js').default>, Argument1<typeof import('./commands/register-trigger.js').default>]): ReturnType<typeof import('./commands/register-trigger.js').default>
		'start'(...args: [Argument0<typeof import('./commands/start.js').default>, Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		'unload'(...args: [Argument1<typeof import('./commands/unload.js').default>]): ReturnType<typeof import('./commands/unload.js').default>
	}
}

export { commands as default };