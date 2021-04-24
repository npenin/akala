/* eslint-disable @typescript-eslint/no-unused-vars */
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace pm
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'alias', ...args: [Argument0<typeof import('./commands/alias').default>, Argument1<typeof import('./commands/alias').default>]): ReturnType<typeof import('./commands/alias').default>
		dispatch (cmd:'config', ...args: [Argument0<typeof import('./commands/config').default>, Argument1<typeof import('./commands/config').default>]): ReturnType<typeof import('./commands/config').default>
		dispatch (cmd:'connect', ...args: [Argument0<typeof import('./commands/connect').default>, Argument1<typeof import('./commands/connect').default>]): ReturnType<typeof import('./commands/connect').default>
		dispatch (cmd:'discover', ...args: [Argument0<typeof import('./commands/discover').default>, Argument1<typeof import('./commands/discover').default>]): ReturnType<typeof import('./commands/discover').default>
		dispatch (cmd:'install', ...args: [Argument0<typeof import('./commands/install').default>]): ReturnType<typeof import('./commands/install').default>
		dispatch (cmd:'link', ...args: [Argument0<typeof import('./commands/link').default>, Argument1<typeof import('./commands/link').default>]): ReturnType<typeof import('./commands/link').default>
		dispatch (cmd:'log', ...args: [Argument0<typeof import('./commands/log').default>]): ReturnType<typeof import('./commands/log').default>
		dispatch (cmd:'ls', ...args: []): ReturnType<typeof import('./commands/ls').default>
		dispatch (cmd:'map', ...args: [Argument0<typeof import('./commands/map').default>, Argument1<typeof import('./commands/map').default>, Argument2<typeof import('./commands/map').default>, Argument3<typeof import('./commands/map').default>]): ReturnType<typeof import('./commands/map').default>
		dispatch (cmd:'ready', ...args: []): ReturnType<typeof import('./commands/ready').default>
		dispatch (cmd:'start', ...args: [Argument1<typeof import('./commands/start').default>, Argument2<typeof import('./commands/start').default>]): ReturnType<typeof import('./commands/start').default>
		dispatch (cmd:'status', ...args: [Argument0<typeof import('./commands/status').default>]): ReturnType<typeof import('./commands/status').default>
		dispatch (cmd:'stop', ...args: [Argument0<typeof import('./commands/stop').default>]): ReturnType<typeof import('./commands/stop').default>
		dispatch (cmd:'update', ...args: [Argument0<typeof import('./commands/update').default>, Argument1<typeof import('./commands/update').default>]): ReturnType<typeof import('./commands/update').default>
		dispatch (cmd:'version', ...args: [Argument0<typeof import('./commands/version').default>, Argument1<typeof import('./commands/version').default>]): ReturnType<typeof import('./commands/version').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		'alias'(...args: [Argument0<typeof import('./commands/alias').default>, Argument1<typeof import('./commands/alias').default>]): ReturnType<typeof import('./commands/alias').default>
		'config'(...args: [Argument0<typeof import('./commands/config').default>, Argument1<typeof import('./commands/config').default>]): ReturnType<typeof import('./commands/config').default>
		'connect'(...args: [Argument0<typeof import('./commands/connect').default>, Argument1<typeof import('./commands/connect').default>]): ReturnType<typeof import('./commands/connect').default>
		'discover'(...args: [Argument0<typeof import('./commands/discover').default>, Argument1<typeof import('./commands/discover').default>]): ReturnType<typeof import('./commands/discover').default>
		'install'(...args: [Argument0<typeof import('./commands/install').default>]): ReturnType<typeof import('./commands/install').default>
		'link'(...args: [Argument0<typeof import('./commands/link').default>, Argument1<typeof import('./commands/link').default>]): ReturnType<typeof import('./commands/link').default>
		'log'(...args: [Argument0<typeof import('./commands/log').default>]): ReturnType<typeof import('./commands/log').default>
		'ls'(...args: []): ReturnType<typeof import('./commands/ls').default>
		'map'(...args: [Argument0<typeof import('./commands/map').default>, Argument1<typeof import('./commands/map').default>, Argument2<typeof import('./commands/map').default>, Argument3<typeof import('./commands/map').default>]): ReturnType<typeof import('./commands/map').default>
		'ready'(...args: []): ReturnType<typeof import('./commands/ready').default>
		'start'(...args: [Argument1<typeof import('./commands/start').default>, Argument2<typeof import('./commands/start').default>]): ReturnType<typeof import('./commands/start').default>
		'status'(...args: [Argument0<typeof import('./commands/status').default>]): ReturnType<typeof import('./commands/status').default>
		'stop'(...args: [Argument0<typeof import('./commands/stop').default>]): ReturnType<typeof import('./commands/stop').default>
		'update'(...args: [Argument0<typeof import('./commands/update').default>, Argument1<typeof import('./commands/update').default>]): ReturnType<typeof import('./commands/update').default>
		'version'(...args: [Argument0<typeof import('./commands/version').default>, Argument1<typeof import('./commands/version').default>]): ReturnType<typeof import('./commands/version').default>
	}
}

export { pm as default };