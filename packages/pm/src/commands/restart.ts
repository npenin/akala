import { type StdioOptions } from "child_process";
import pmContainer from '../container.js';
import { type CliContext } from "@akala/cli";

export default async function restart(pm: pmContainer.container, name: string, context?: CliContext<{ new?: boolean, name: string, inspect?: boolean, verbose?: number, wait?: boolean }>): Promise<void | { execPath: string, args: string[], cwd: string, stdio: StdioOptions, shell: boolean, windowsHide: boolean }>
{
    await pm.dispatch('stop', name);
    await pm.dispatch('start', name, context.options, context);
}
