/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arguments, Argument0, Argument1, Argument2, Argument3, Argument4, Argument5, Argument6, Argument7, Argument8, Argument9, Argument10, Argument11, Argument12, Argument13, Argument14, Argument15, Argument16, Argument17 } from '@akala/core';
import { ContainerLite } from '@akala/pm';
type PromisedReturnType<T extends (...args: any) => any> = ReturnType<T> extends Promise<any> ? ReturnType<T> : Promise<ReturnType<T>>

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace commands
{
	export interface container extends ContainerLite 
	{
		dispatch(cmd: '$init', ...args: [Argument0<typeof import('./commands/$init').default>]): PromisedReturnType<typeof import('./commands/$init').default>
		dispatch(cmd: 'enqueue', ...args: [Argument0<typeof import('./commands/enqueue').default>, Argument1<typeof import('./commands/enqueue').default>, Argument2<typeof import('./commands/enqueue').default>]): PromisedReturnType<typeof import('./commands/enqueue').default>
		dispatch(cmd: 'load', ...args: [Argument0<typeof import('./commands/load').default>, Argument1<typeof import('./commands/load').default>]): PromisedReturnType<typeof import('./commands/load').default>
		dispatch(cmd: 'register-loader', ...args: [Argument0<typeof import('./commands/register-loader').default>]): PromisedReturnType<typeof import('./commands/register-loader').default>
	}
	export interface proxy 
	{
		'$init'(...args: [Argument0<typeof import('./commands/$init').default>]): PromisedReturnType<typeof import('./commands/$init').default>
		'enqueue'(...args: [Argument0<typeof import('./commands/enqueue').default>, Argument1<typeof import('./commands/enqueue').default>, Argument2<typeof import('./commands/enqueue').default>]): PromisedReturnType<typeof import('./commands/enqueue').default>
		'load'(...args: [Argument0<typeof import('./commands/load').default>, Argument1<typeof import('./commands/load').default>]): PromisedReturnType<typeof import('./commands/load').default>
		'register-loader'(...args: [Argument0<typeof import('./commands/register-loader').default>]): PromisedReturnType<typeof import('./commands/register-loader').default>
	}
}

export { commands as default };