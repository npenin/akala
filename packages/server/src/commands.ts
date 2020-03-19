declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
declare type Argument0<T> = T extends ((x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument1<T> = T extends ((a:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument2<T> = T extends ((a:any, b:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument3<T> = T extends ((a:any, b:any, c:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument4<T> = T extends ((a:any, b:any, c:any, d:any, x: infer X, ...z:any[]) => any) ? X : never;
export namespace description 
	{
	export interface commands 
	{
		dispatch (cmd:'asset', ...args:[Argument1<typeof import('./commands/asset').default>, Argument2<typeof import('./commands/asset').default>]): ReturnType<typeof import('./commands/asset').default>
		dispatch (cmd:'compile', ...args:[Argument0<typeof import('./commands/compile').default>, Argument2<typeof import('./commands/compile').default>]): ReturnType<typeof import('./commands/compile').default>
		dispatch (cmd:'remove-asset', ...args:[Argument1<typeof import('./commands/remove-asset').default>, Argument2<typeof import('./commands/remove-asset').default>]): ReturnType<typeof import('./commands/remove-asset').default>
		dispatch (cmd:'route', ...args:[Argument1<typeof import('./commands/route').default>, Argument2<typeof import('./commands/route').default>, Argument3<typeof import('./commands/route').default>]): ReturnType<typeof import('./commands/route').default>
	}
}
