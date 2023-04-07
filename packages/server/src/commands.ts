//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore 6133
//eslint-disable-next-line @typescript-eslint/no-unused-vars
import {Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container 
	{
		dispatch (cmd:'$init', ...args: []): ReturnType<typeof import('./commands/$init.js').default>
		dispatch (cmd:'asset', ...args: [Argument1<typeof import('./commands/asset.js').default>, Argument2<typeof import('./commands/asset.js').default>]): ReturnType<typeof import('./commands/asset.js').default>
		dispatch (cmd:'mode', ...args: [Argument0<typeof import('./commands/mode.js').default>]): ReturnType<typeof import('./commands/mode.js').default>
		dispatch (cmd:'remote-container', ...args: [Argument1<typeof import('./commands/remote-container.js').default>, Argument2<typeof import('./commands/remote-container.js').default>]): ReturnType<typeof import('./commands/remote-container.js').default>
		dispatch (cmd:'remote-route', ...args: [Argument0<typeof import('./commands/remote-route.js').default>, Argument1<typeof import('./commands/remote-route.js').default>, Argument2<typeof import('./commands/remote-route.js').default>]): ReturnType<typeof import('./commands/remote-route.js').default>
		dispatch (cmd:'remove-asset', ...args: [Argument0<typeof import('./commands/remove-asset.js').default>, Argument1<typeof import('./commands/remove-asset.js').default>]): ReturnType<typeof import('./commands/remove-asset.js').default>
		dispatch (cmd:'require', ...args: [Argument1<typeof import('./commands/require.js').default>, Argument2<typeof import('./commands/require.js').default>]): ReturnType<typeof import('./commands/require.js').default>
		dispatch (cmd:'route', ...args: [Argument0<typeof import('./commands/route.js').default>, Argument1<typeof import('./commands/route.js').default>, Argument2<typeof import('./commands/route.js').default>, Argument3<typeof import('./commands/route.js').default>]): ReturnType<typeof import('./commands/route.js').default>
		dispatch (cmd:'webpack', ...args: [Argument0<typeof import('./commands/webpack.js').default>, Argument1<typeof import('./commands/webpack.js').default>, Argument2<typeof import('./commands/webpack.js').default>]): ReturnType<typeof import('./commands/webpack.js').default>
		dispatch (cmd:'webpack-alias', ...args: [Argument0<typeof import('./commands/webpack-alias.js').default>, Argument1<typeof import('./commands/webpack-alias.js').default>]): ReturnType<typeof import('./commands/webpack-alias.js').default>
		dispatch (cmd:'webpack-html', ...args: [Argument0<typeof import('./commands/webpack-html.js').default>]): ReturnType<typeof import('./commands/webpack-html.js').default>
	}
	export interface proxy 
	{
		'$init'(...args: []): ReturnType<typeof import('./commands/$init.js').default>
		'asset'(...args: [Argument1<typeof import('./commands/asset.js').default>, Argument2<typeof import('./commands/asset.js').default>]): ReturnType<typeof import('./commands/asset.js').default>
		'mode'(...args: [Argument0<typeof import('./commands/mode.js').default>]): ReturnType<typeof import('./commands/mode.js').default>
		'remote-container'(...args: [Argument1<typeof import('./commands/remote-container.js').default>, Argument2<typeof import('./commands/remote-container.js').default>]): ReturnType<typeof import('./commands/remote-container.js').default>
		'remote-route'(...args: [Argument0<typeof import('./commands/remote-route.js').default>, Argument1<typeof import('./commands/remote-route.js').default>, Argument2<typeof import('./commands/remote-route.js').default>]): ReturnType<typeof import('./commands/remote-route.js').default>
		'remove-asset'(...args: [Argument0<typeof import('./commands/remove-asset.js').default>, Argument1<typeof import('./commands/remove-asset.js').default>]): ReturnType<typeof import('./commands/remove-asset.js').default>
		'require'(...args: [Argument1<typeof import('./commands/require.js').default>, Argument2<typeof import('./commands/require.js').default>]): ReturnType<typeof import('./commands/require.js').default>
		'route'(...args: [Argument0<typeof import('./commands/route.js').default>, Argument1<typeof import('./commands/route.js').default>, Argument2<typeof import('./commands/route.js').default>, Argument3<typeof import('./commands/route.js').default>]): ReturnType<typeof import('./commands/route.js').default>
		'webpack'(...args: [Argument0<typeof import('./commands/webpack.js').default>, Argument1<typeof import('./commands/webpack.js').default>, Argument2<typeof import('./commands/webpack.js').default>]): ReturnType<typeof import('./commands/webpack.js').default>
		'webpack-alias'(...args: [Argument0<typeof import('./commands/webpack-alias.js').default>, Argument1<typeof import('./commands/webpack-alias.js').default>]): ReturnType<typeof import('./commands/webpack-alias.js').default>
		'webpack-html'(...args: [Argument0<typeof import('./commands/webpack-html.js').default>]): ReturnType<typeof import('./commands/webpack-html.js').default>
	}
}

export { commands as default };