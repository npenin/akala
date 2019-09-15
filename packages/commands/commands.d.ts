declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
declare module "@akala/commands" {
	export namespace description 
	{
		export interface commands 
		{
			dispatch (cmd:'generate-metadata', ...args:Arguments<typeof import('./dist/cli/generate-metadata.js').default>): any
			dispatch (cmd:'generate', ...args:Arguments<typeof import('./dist/cli/generate.js').default>): any
		}
	}
}
