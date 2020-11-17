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
		dispatch (cmd:'$init', ...args:[Argument1<typeof import('./commands/$init').default>]): ReturnType<typeof import('./commands/$init').default>
		dispatch (cmd:'commit', ...args:[Argument1<typeof import('./commands/commit').default>]): ReturnType<typeof import('./commands/commit').default>
		dispatch (cmd:'get', ...args:[Argument0<typeof import('./commands/get').default>, Argument1<typeof import('./commands/get').default>]): ReturnType<typeof import('./commands/get').default>
		dispatch (cmd:'revert', ...args:[Argument0<typeof import('./commands/revert').default>]): ReturnType<typeof import('./commands/revert').default>
		dispatch (cmd:'set', ...args:[Argument0<typeof import('./commands/set').default>, Argument1<typeof import('./commands/set').default>, Argument2<typeof import('./commands/set').default>]): ReturnType<typeof import('./commands/set').default>
	}
}
