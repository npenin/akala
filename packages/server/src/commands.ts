declare type Argument0<T> = T extends ((x: infer X, ...z: unknown[]) => unknown) ? X : never;
declare type Argument1<T> = T extends ((a: unknown, x: infer X, ...z: unknown[]) => unknown) ? X : never;
declare type Argument2<T> = T extends ((a: unknown, b: unknown, x: infer X, ...z: unknown[]) => unknown) ? X : never;
declare type Argument3<T> = T extends ((a: unknown, b: unknown, c: unknown, x: infer X, ...z: unknown[]) => unknown) ? X : never;
export default interface container 
{
	dispatch(cmd: '$init', ...args: []): ReturnType<typeof import('./commands/$init').default>
	dispatch(cmd: 'asset', ...args: [Argument1<typeof import('./commands/asset').default>, Argument2<typeof import('./commands/asset').default>]): ReturnType<typeof import('./commands/asset').default>
	dispatch(cmd: 'mode', ...args: [Argument0<typeof import('./commands/mode').default>]): ReturnType<typeof import('./commands/mode').default>
	dispatch(cmd: 'remote-container', ...args: [Argument1<typeof import('./commands/remote-container').default>, Argument2<typeof import('./commands/remote-container').default>]): ReturnType<typeof import('./commands/remote-container').default>
	dispatch(cmd: 'remote-route', ...args: [Argument0<typeof import('./commands/remote-route').default>, Argument1<typeof import('./commands/remote-route').default>, Argument2<typeof import('./commands/remote-route').default>]): ReturnType<typeof import('./commands/remote-route').default>
	dispatch(cmd: 'remove-asset', ...args: [Argument0<typeof import('./commands/remove-asset').default>, Argument1<typeof import('./commands/remove-asset').default>]): ReturnType<typeof import('./commands/remove-asset').default>
	dispatch(cmd: 'require', ...args: [Argument1<typeof import('./commands/require').default>, Argument2<typeof import('./commands/require').default>]): ReturnType<typeof import('./commands/require').default>
	dispatch(cmd: 'route', ...args: [Argument0<typeof import('./commands/route').default>, Argument1<typeof import('./commands/route').default>, Argument2<typeof import('./commands/route').default>, Argument3<typeof import('./commands/route').default>]): ReturnType<typeof import('./commands/route').default>
	dispatch(cmd: 'webpack-alias', ...args: [Argument0<typeof import('./commands/webpack-alias').default>, Argument1<typeof import('./commands/webpack-alias').default>]): ReturnType<typeof import('./commands/webpack-alias').default>
	dispatch(cmd: 'webpack-html', ...args: [Argument0<typeof import('./commands/webpack-html').default>]): ReturnType<typeof import('./commands/webpack-html').default>
	dispatch(cmd: 'webpack', ...args: [Argument0<typeof import('./commands/webpack').default>, Argument1<typeof import('./commands/webpack').default>, Argument2<typeof import('./commands/webpack').default>]): ReturnType<typeof import('./commands/webpack').default>
}
