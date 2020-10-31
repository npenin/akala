declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
declare type Argument0<T> = T extends ((x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument1<T> = T extends ((a:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument2<T> = T extends ((a:any, b:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument3<T> = T extends ((a:any, b:any, c:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument4<T> = T extends ((a:any, b:any, c:any, d:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument5<T> = T extends ((a:any, b:any, c:any, d:any, e:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument6<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument7<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument8<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument9<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument10<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument11<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument12<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument13<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, m:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument14<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, m:any, n:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument15<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, m:any, n:any, o:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument16<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, m:any, n:any, o:any, p:any, x: infer X, ...z:any[]) => any) ? X : never;
declare type Argument17<T> = T extends ((a:any, b:any, c:any, d:any, e:any, f:any, g:any, h:any, i:any, j:any, k:any, l:any, m:any, n:any, o:any, p:any, q:any, x: infer X, ...z:any[]) => any) ? X : never;
export namespace description 
	{
	export interface commands 
	{
		dispatch (cmd:'$init', ...args:[]): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'asset', ...args:[Argument1<typeof import('./commands/asset').default>, Argument2<typeof import('./commands/asset').default>]): ReturnType<typeof import('./commands/asset').default>
		dispatch (cmd:'compile', ...args:[Argument0<typeof import('./commands/compile').default>, Argument2<typeof import('./commands/compile').default>, Argument3<typeof import('./commands/compile').default>, Argument4<typeof import('./commands/compile').default>, Argument5<typeof import('./commands/compile').default>, Argument6<typeof import('./commands/compile').default>, Argument7<typeof import('./commands/compile').default>, Argument8<typeof import('./commands/compile').default>, Argument9<typeof import('./commands/compile').default>, Argument10<typeof import('./commands/compile').default>, Argument11<typeof import('./commands/compile').default>, Argument12<typeof import('./commands/compile').default>, Argument13<typeof import('./commands/compile').default>, Argument14<typeof import('./commands/compile').default>, Argument15<typeof import('./commands/compile').default>, Argument16<typeof import('./commands/compile').default>, Argument17<typeof import('./commands/compile').default>]): ReturnType<typeof import('./commands/compile').default>
		dispatch (cmd:'mode', ...args:[Argument0<typeof import('./commands/mode').default>]): ReturnType<typeof import('./commands/mode').default>
		dispatch (cmd:'remote-container', ...args:[Argument0<typeof import('./commands/remote-container').default>, Argument1<typeof import('./commands/remote-container').default>]): ReturnType<typeof import('./commands/remote-container').default>
		dispatch (cmd:'remote-route', ...args:[Argument0<typeof import('./commands/remote-route').default>, Argument1<typeof import('./commands/remote-route').default>, Argument2<typeof import('./commands/remote-route').default>]): ReturnType<typeof import('./commands/remote-route').default>
		dispatch (cmd:'remove-asset', ...args:[Argument0<typeof import('./commands/remove-asset').default>, Argument1<typeof import('./commands/remove-asset').default>]): ReturnType<typeof import('./commands/remove-asset').default>
		dispatch (cmd:'require', ...args:[Argument1<typeof import('./commands/require').default>, Argument2<typeof import('./commands/require').default>]): ReturnType<typeof import('./commands/require').default>
		dispatch (cmd:'route', ...args:[Argument0<typeof import('./commands/route').default>, Argument1<typeof import('./commands/route').default>, Argument2<typeof import('./commands/route').default>, Argument3<typeof import('./commands/route').default>]): ReturnType<typeof import('./commands/route').default>
		dispatch (cmd:'webpack-alias', ...args:[Argument0<typeof import('./commands/webpack-alias').default>, Argument1<typeof import('./commands/webpack-alias').default>]): ReturnType<typeof import('./commands/webpack-alias').default>
		dispatch (cmd:'webpack-html', ...args:[Argument0<typeof import('./commands/webpack-html').default>]): ReturnType<typeof import('./commands/webpack-html').default>
		dispatch (cmd:'webpack', ...args:[Argument0<typeof import('./commands/webpack').default>, Argument1<typeof import('./commands/webpack').default>, Argument2<typeof import('./commands/webpack').default>]): ReturnType<typeof import('./commands/webpack').default>
	}
}
