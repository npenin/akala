import { Workflow } from "./automate.js";

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace loader
{
	export interface container 
	{
		dispatch(cmd: 'load', source: string): Promise<Workflow>
	}
	export interface proxy 
	{
		'load'(source: string): Promise<Workflow>
	}
}

export { loader as default };