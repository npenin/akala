/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import { ContainerLite } from '@akala/pm';
type PromisedReturnType<T extends (...args: any) => any> = ReturnType<T> extends Promise<any> ? ReturnType<T> : Promise<ReturnType<T>>
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace server
{
	export interface container extends ContainerLite
	{
		dispatch(cmd: '$init', ...args: []): PromisedReturnType<typeof import('./commands/$init').default>
		dispatch(cmd: 'asset', ...args: [Argument1<typeof import('./commands/asset').default>, Argument2<typeof import('./commands/asset').default>]): PromisedReturnType<typeof import('./commands/asset').default>
		dispatch(cmd: 'mode', ...args: [Argument0<typeof import('./commands/mode').default>]): PromisedReturnType<typeof import('./commands/mode').default>
		dispatch(cmd: 'remote-container', ...args: [Argument1<typeof import('./commands/remote-container').default>, Argument2<typeof import('./commands/remote-container').default>]): PromisedReturnType<typeof import('./commands/remote-container').default>
		dispatch(cmd: 'remote-route', ...args: [Argument0<typeof import('./commands/remote-route').default>, Argument1<typeof import('./commands/remote-route').default>, Argument2<typeof import('./commands/remote-route').default>]): PromisedReturnType<typeof import('./commands/remote-route').default>
		dispatch(cmd: 'remove-asset', ...args: [Argument0<typeof import('./commands/remove-asset').default>, Argument1<typeof import('./commands/remove-asset').default>]): PromisedReturnType<typeof import('./commands/remove-asset').default>
		dispatch(cmd: 'require', ...args: [Argument1<typeof import('./commands/require').default>, Argument2<typeof import('./commands/require').default>]): PromisedReturnType<typeof import('./commands/require').default>
		dispatch(cmd: 'route', ...args: [Argument0<typeof import('./commands/route').default>, Argument1<typeof import('./commands/route').default>, Argument2<typeof import('./commands/route').default>, Argument3<typeof import('./commands/route').default>]): PromisedReturnType<typeof import('./commands/route').default>
		dispatch(cmd: 'webpack-alias', ...args: [Argument0<typeof import('./commands/webpack-alias').default>, Argument1<typeof import('./commands/webpack-alias').default>]): PromisedReturnType<typeof import('./commands/webpack-alias').default>
		dispatch(cmd: 'webpack-html', ...args: [Argument0<typeof import('./commands/webpack-html').default>]): PromisedReturnType<typeof import('./commands/webpack-html').default>
		dispatch(cmd: 'webpack', ...args: [Argument0<typeof import('./commands/webpack').default>, Argument1<typeof import('./commands/webpack').default>, Argument2<typeof import('./commands/webpack').default>]): PromisedReturnType<typeof import('./commands/webpack').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): PromisedReturnType<typeof import('./commands/$init').default>
		'asset'(...args: [Argument1<typeof import('./commands/asset').default>, Argument2<typeof import('./commands/asset').default>]): PromisedReturnType<typeof import('./commands/asset').default>
		'mode'(...args: [Argument0<typeof import('./commands/mode').default>]): PromisedReturnType<typeof import('./commands/mode').default>
		'remote-container'(...args: [Argument1<typeof import('./commands/remote-container').default>, Argument2<typeof import('./commands/remote-container').default>]): PromisedReturnType<typeof import('./commands/remote-container').default>
		'remote-route'(...args: [Argument0<typeof import('./commands/remote-route').default>, Argument1<typeof import('./commands/remote-route').default>, Argument2<typeof import('./commands/remote-route').default>]): PromisedReturnType<typeof import('./commands/remote-route').default>
		'remove-asset'(...args: [Argument0<typeof import('./commands/remove-asset').default>, Argument1<typeof import('./commands/remove-asset').default>]): PromisedReturnType<typeof import('./commands/remove-asset').default>
		'require'(...args: [Argument1<typeof import('./commands/require').default>, Argument2<typeof import('./commands/require').default>]): PromisedReturnType<typeof import('./commands/require').default>
		'route'(...args: [Argument0<typeof import('./commands/route').default>, Argument1<typeof import('./commands/route').default>, Argument2<typeof import('./commands/route').default>, Argument3<typeof import('./commands/route').default>]): PromisedReturnType<typeof import('./commands/route').default>
		'webpack-alias'(...args: [Argument0<typeof import('./commands/webpack-alias').default>, Argument1<typeof import('./commands/webpack-alias').default>]): PromisedReturnType<typeof import('./commands/webpack-alias').default>
		'webpack-html'(...args: [Argument0<typeof import('./commands/webpack-html').default>]): PromisedReturnType<typeof import('./commands/webpack-html').default>
		'webpack'(...args: [Argument0<typeof import('./commands/webpack').default>, Argument1<typeof import('./commands/webpack').default>, Argument2<typeof import('./commands/webpack').default>]): PromisedReturnType<typeof import('./commands/webpack').default>
	}
}

export { server as default };