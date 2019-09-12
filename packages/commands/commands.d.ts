declare module "@akala/commands" {
	declare namespace description 
	{
		export interface cli 
		{
			dispatch (cmd:'generate-metadata', ...args:any[]): any
			dispatch (cmd:'generate', ...args:any[]): any
		}
	}
}
