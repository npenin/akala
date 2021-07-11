// eslint-disable-next-line @typescript-eslint/no-namespace
namespace loader
{
	export interface container 
	{
		dispatch (cmd:'load', source:string): unknown
	}
	export interface proxy 
	{
		'load'(source:string): unknown
	}
}

export { loader as default };