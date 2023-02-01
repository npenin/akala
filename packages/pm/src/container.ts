/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch(cmd: '$init', ...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		dispatch(cmd: 'bridge', ...args: [Argument0<typeof import('./commands/bridge.js').default>, Argument1<typeof import('./commands/bridge.js').default>]): ReturnType<typeof import('./commands/bridge.js').default>
		dispatch(cmd: 'config', ...args: [Argument0<typeof import('./commands/config.js').default>, Argument1<typeof import('./commands/config.js').default>]): ReturnType<typeof import('./commands/config.js').default>
		dispatch(cmd: 'connect', ...args: [Argument0<typeof import('./commands/connect.js').default>, Argument1<typeof import('./commands/connect.js').default>]): ReturnType<typeof import('./commands/connect.js').default>
		dispatch(cmd: 'discover', ...args: [Argument0<typeof import('./commands/discover.js').default>, Argument1<typeof import('./commands/discover.js').default>]): ReturnType<typeof import('./commands/discover.js').default>
		dispatch(cmd: 'install', ...args: [Argument0<typeof import('./commands/install.js').default>]): ReturnType<typeof import('./commands/install.js').default>
		dispatch(cmd: 'link', ...args: [Argument0<typeof import('./commands/link.js').default>, Argument1<typeof import('./commands/link.js').default>]): ReturnType<typeof import('./commands/link.js').default>
		dispatch(cmd: 'log', ...args: [Argument0<typeof import('./commands/log.js').default>]): ReturnType<typeof import('./commands/log.js').default>
		dispatch(cmd: 'ls', ...args: []): ReturnType<typeof import('./commands/ls.js').default>
		dispatch(cmd: 'map', ...args: [Argument0<typeof import('./commands/map.js').default>, Argument1<typeof import('./commands/map.js').default>, Argument2<typeof import('./commands/map.js').default>, Argument3<typeof import('./commands/map.js').default>]): ReturnType<typeof import('./commands/map.js').default>
		dispatch(cmd: 'name', ...args: [Argument0<typeof import('./commands/name.js').default>]): ReturnType<typeof import('./commands/name.js').default>
		dispatch(cmd: 'proxy', ...args: [Argument0<typeof import('./commands/proxy.js').default>, Argument1<typeof import('./commands/proxy.js').default>]): ReturnType<typeof import('./commands/proxy.js').default>
		dispatch(cmd: 'ready', ...args: []): ReturnType<typeof import('./commands/ready.js').default>
		dispatch(cmd: 'reload-metadata', ...args: [Argument0<typeof import('./commands/reload-metadata.js').default>]): ReturnType<typeof import('./commands/reload-metadata.js').default>
		dispatch(cmd: 'restart', ...args: [Argument1<typeof import('./commands/restart.js').default>, Argument2<typeof import('./commands/restart.js').default>]): ReturnType<typeof import('./commands/restart.js').default>
		dispatch(cmd: 'start', ...args: [Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		dispatch(cmd: 'status', ...args: [Argument0<typeof import('./commands/status.js').default>]): ReturnType<typeof import('./commands/status.js').default>
		dispatch(cmd: 'stop', ...args: [Argument0<typeof import('./commands/stop.js').default>]): ReturnType<typeof import('./commands/stop.js').default>
		dispatch(cmd: 'update', ...args: [Argument0<typeof import('./commands/update.js').default>, Argument1<typeof import('./commands/update.js').default>]): ReturnType<typeof import('./commands/update.js').default>
		dispatch(cmd: 'version', ...args: [Argument0<typeof import('./commands/version.js').default>, Argument1<typeof import('./commands/version.js').default>]): ReturnType<typeof import('./commands/version.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument1<typeof import('./commands/$init.js').default>]): ReturnType<typeof import('./commands/$init.js').default>
		'bridge'(...args: [Argument0<typeof import('./commands/bridge.js').default>, Argument1<typeof import('./commands/bridge.js').default>]): ReturnType<typeof import('./commands/bridge.js').default>
		'config'(...args: [Argument0<typeof import('./commands/config.js').default>, Argument1<typeof import('./commands/config.js').default>]): ReturnType<typeof import('./commands/config.js').default>
		'connect'(...args: [Argument0<typeof import('./commands/connect.js').default>, Argument1<typeof import('./commands/connect.js').default>]): ReturnType<typeof import('./commands/connect.js').default>
		'discover'(...args: [Argument0<typeof import('./commands/discover.js').default>, Argument1<typeof import('./commands/discover.js').default>]): ReturnType<typeof import('./commands/discover.js').default>
		'install'(...args: [Argument0<typeof import('./commands/install.js').default>]): ReturnType<typeof import('./commands/install.js').default>
		'link'(...args: [Argument0<typeof import('./commands/link.js').default>, Argument1<typeof import('./commands/link.js').default>]): ReturnType<typeof import('./commands/link.js').default>
		'log'(...args: [Argument0<typeof import('./commands/log.js').default>]): ReturnType<typeof import('./commands/log.js').default>
		'ls'(...args: []): ReturnType<typeof import('./commands/ls.js').default>
		'map'(...args: [Argument0<typeof import('./commands/map.js').default>, Argument1<typeof import('./commands/map.js').default>, Argument2<typeof import('./commands/map.js').default>, Argument3<typeof import('./commands/map.js').default>]): ReturnType<typeof import('./commands/map.js').default>
		'name'(...args: [Argument0<typeof import('./commands/name.js').default>]): ReturnType<typeof import('./commands/name.js').default>
		'proxy'(...args: [Argument0<typeof import('./commands/proxy.js').default>, Argument1<typeof import('./commands/proxy.js').default>]): ReturnType<typeof import('./commands/proxy.js').default>
		'ready'(...args: []): ReturnType<typeof import('./commands/ready.js').default>
		'reload-metadata'(...args: [Argument0<typeof import('./commands/reload-metadata.js').default>]): ReturnType<typeof import('./commands/reload-metadata.js').default>
		'restart'(...args: [Argument1<typeof import('./commands/restart.js').default>, Argument2<typeof import('./commands/restart.js').default>]): ReturnType<typeof import('./commands/restart.js').default>
		'start'(...args: [Argument1<typeof import('./commands/start.js').default>, Argument2<typeof import('./commands/start.js').default>]): ReturnType<typeof import('./commands/start.js').default>
		'status'(...args: [Argument0<typeof import('./commands/status.js').default>]): ReturnType<typeof import('./commands/status.js').default>
		'stop'(...args: [Argument0<typeof import('./commands/stop.js').default>]): ReturnType<typeof import('./commands/stop.js').default>
		'update'(...args: [Argument0<typeof import('./commands/update.js').default>, Argument1<typeof import('./commands/update.js').default>]): ReturnType<typeof import('./commands/update.js').default>
		'version'(...args: [Argument0<typeof import('./commands/version.js').default>, Argument1<typeof import('./commands/version.js').default>]): ReturnType<typeof import('./commands/version.js').default>
	}
}

export { commands as default };