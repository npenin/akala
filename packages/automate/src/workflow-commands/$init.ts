import { buildCliContextFromProcess, CliContext } from "@akala/cli";
import { Container, serve, serveMetadata, ServeOptions } from "@akala/commands";
import { Container as pmContainer } from "@akala/pm";
import workflow from "../workflow";

export default async function $init(this: CliContext, name: string, pm: pmContainer, options: ServeOptions, self: workflow.container & Container<void>, signal: AbortSignal)
{
    this.currentWorkingDirectory = process.cwd();
    this.logger = buildCliContextFromProcess().logger;
    if (pm)
    {
        await pm.dispatch('connect', name, options);
        self.register('pm', pm);
    }
    else
    {
        await serve(self, { signal, ...serveMetadata(name, options) });
    }
}