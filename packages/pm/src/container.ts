declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
declare type Argument0<T> = T extends ((x: infer X, ...z: any[]) => any) ? X : never;
declare type Argument1<T> = T extends ((a: any, x: infer X, ...z: any[]) => any) ? X : never;
declare type Argument2<T> = T extends ((a: any, b: any, x: infer X, ...z: any[]) => any) ? X : never;
declare type Argument3<T> = T extends ((a: any, b: any, c: any, x: infer X, ...z: any[]) => any) ? X : never;
declare type Argument4<T> = T extends ((a: any, b: any, c: any, d: any, x: infer X, ...z: any[]) => any) ? X : never;
export namespace description 
{
	export interface pm 
	{
		dispatch(cmd: '$serve'): any
		dispatch(cmd: '$attach'): any
		dispatch(cmd: '$metadata'): any
		dispatch(cmd: '$init', ...args: []): ReturnType<typeof import('./commands/$init').default>
		dispatch(cmd: 'config', ...args: [Argument0<typeof import('./commands/config').default>]): ReturnType<typeof import('./commands/config').default>
		dispatch(cmd: 'discover', ...args: [Argument0<typeof import('./commands/discover').default>, Argument1<typeof import('./commands/discover').default>]): ReturnType<typeof import('./commands/discover').default>
		dispatch(cmd: 'install', ...args: [Argument0<typeof import('./commands/install').default>, Argument1<typeof import('./commands/install').default>]): ReturnType<typeof import('./commands/install').default>
		dispatch(cmd: 'link', ...args: [Argument0<typeof import('./commands/link').default>, Argument1<typeof import('./commands/link').default>]): ReturnType<typeof import('./commands/link').default>
		dispatch(cmd: 'ls', ...args: []): ReturnType<typeof import('./commands/ls').default>
		dispatch(cmd: 'map', ...args: [Argument0<typeof import('./commands/map').default>, Argument1<typeof import('./commands/map').default>, Argument2<typeof import('./commands/map').default>]): ReturnType<typeof import('./commands/map').default>
		dispatch(cmd: 'run', ...args: [Argument0<typeof import('./commands/run').default>, Argument1<typeof import('./commands/run').default>, Argument2<typeof import('./commands/run').default>]): ReturnType<typeof import('./commands/run').default>
		dispatch(cmd: 'start', ...args: [Argument1<typeof import('./commands/start').default>]): ReturnType<typeof import('./commands/start').default>
		dispatch(cmd: 'status', ...args: [Argument0<typeof import('./commands/status').default>]): ReturnType<typeof import('./commands/status').default>
		dispatch(cmd: 'stop', ...args: [Argument0<typeof import('./commands/stop').default>]): ReturnType<typeof import('./commands/stop').default>
		dispatch(cmd: 'update', ...args: [Argument0<typeof import('./commands/update').default>, Argument1<typeof import('./commands/update').default>]): ReturnType<typeof import('./commands/update').default>
		dispatch(cmd: 'version', ...args: [Argument0<typeof import('./commands/version').default>, Argument1<typeof import('./commands/version').default>]): ReturnType<typeof import('./commands/version').default>
	}
}
