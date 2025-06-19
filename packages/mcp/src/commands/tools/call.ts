import { State } from "../../state.js";

export default async function (this: State, name: string, args: unknown[]): Promise<{ content: unknown, isError: boolean }>
{
    const tool = this.capabilities.tools.find(t => t.name === name);
    try
    {
        const result = await this.container.dispatch(tool.command, args)
        return { content: result, isError: false };
    }
    catch (e)
    {
        return {
            content: {
                stack: e.stack,
                code: e.code,
                statusCode: e.statusCode,
                message: e.message
            }, isError: true
        };
    }
}
