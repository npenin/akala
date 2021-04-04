import { Arguments } from '@akala/core';
import { AsDispatchArgs } from './model/container';

type Promisify<T> = T extends Promise<unknown> ? T : Promise<T>;

export default interface commands
{
	dispatch(cmd: 'generate-declaration', ...args: AsDispatchArgs<Arguments<typeof import('./cli/generate-declaration').default>>): Promisify<ReturnType<typeof import('./cli/generate-declaration').default>>
	dispatch(cmd: 'generate-metadata', ...args: AsDispatchArgs<Arguments<typeof import('./cli/generate-metadata').default>>): Promisify<ReturnType<typeof import('./cli/generate-metadata').default>>
	dispatch(cmd: 'generate', ...args: AsDispatchArgs<Arguments<typeof import('./cli/generate').default>>): Promisify<ReturnType<typeof import('./cli/generate').default>>
}
