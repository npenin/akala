declare type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;
export namespace description 
{
	export interface commands 
	{
		dispatch(cmd: 'generate-declaration', ...args: Arguments<typeof import('./cli/generate-declaration').default>): ReturnType<typeof import('./cli/generate-declaration').default>
		dispatch(cmd: 'generate-metadata', ...args: Arguments<typeof import('./cli/generate-metadata').default>): ReturnType<typeof import('./cli/generate-metadata').default>
		dispatch(cmd: 'generate', ...args: Arguments<typeof import('./cli/generate').default>): ReturnType<typeof import('./cli/generate').default>
		dispatch(cmd: 'start', ...args: Arguments<typeof import('./cli/start').default>): ReturnType<typeof import('./cli/start').default>
	}
}
