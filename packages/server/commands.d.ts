declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
declare type Argument0<T> = T extends ((x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument1<T> = T extends ((a:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument2<T> = T extends ((a:any, b:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument3<T> = T extends ((a:any, b:any, c:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument4<T> = T extends ((a:any, b:any, c:any, d:any, x: infer X, ...z:any[]) => any) ? X : never;
declare namespace description 
	{
	export interface commands 
	{
		dispatch (cmd:'$init', ...args:[]): ReturnType<typeof import('./../../src/commands/$init').default>
		dispatch (cmd:'asset', ...args:[Argument1<typeof import('./../../src/commands/asset').default>, Argument2<typeof import('./../../src/commands/asset').default>]): ReturnType<typeof import('./../../src/commands/asset').default>
		dispatch (cmd:'compile', ...args:[Argument0<typeof import('./../../src/commands/compile').default>, Argument2<typeof import('./../../src/commands/compile').default>, Argument3<typeof import('./../../src/commands/compile').default>, Argument4<typeof import('./../../src/commands/compile').default>, Argument5<typeof import('./../../src/commands/compile').default>, Argument6<typeof import('./../../src/commands/compile').default>, Argument7<typeof import('./../../src/commands/compile').default>, Argument8<typeof import('./../../src/commands/compile').default>, Argument9<typeof import('./../../src/commands/compile').default>, Argument10<typeof import('./../../src/commands/compile').default>, Argument11<typeof import('./../../src/commands/compile').default>, Argument12<typeof import('./../../src/commands/compile').default>, Argument13<typeof import('./../../src/commands/compile').default>, Argument14<typeof import('./../../src/commands/compile').default>, Argument15<typeof import('./../../src/commands/compile').default>, Argument16<typeof import('./../../src/commands/compile').default>, Argument17<typeof import('./../../src/commands/compile').default>]): ReturnType<typeof import('./../../src/commands/compile').default>
		dispatch (cmd:'remove-asset', ...args:[Argument1<typeof import('./../../src/commands/remove-asset').default>, Argument2<typeof import('./../../src/commands/remove-asset').default>]): ReturnType<typeof import('./../../src/commands/remove-asset').default>
		dispatch (cmd:'route', ...args:[Argument0<typeof import('./../../src/commands/route').default>, Argument1<typeof import('./../../src/commands/route').default>, Argument2<typeof import('./../../src/commands/route').default>, Argument3<typeof import('./../../src/commands/route').default>]): ReturnType<typeof import('./../../src/commands/route').default>
		dispatch (cmd:'webpack-html', ...args:[]): ReturnType<typeof import('./../../src/commands/webpack-html').default>
		dispatch (cmd:'webpack', ...args:[Argument0<typeof import('./../../src/commands/webpack').default>, Argument1<typeof import('./../../src/commands/webpack').default>, Argument2<typeof import('./../../src/commands/webpack').default>]): ReturnType<typeof import('./../../src/commands/webpack').default>
	}
}
