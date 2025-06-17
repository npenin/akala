import { NamespaceMiddleware } from "@akala/cli";
import { McpTrigger } from "./mcp-trigger.js";
import { containers } from "@akala/commands/akala";
import { Container, registerCommands, Processors } from "@akala/commands";
import { ErrorWithStatus, HttpStatusCode } from "@akala/core";

export default function (_config, program: NamespaceMiddleware)
{
    program.command<{ commands: string }>('mcp <commands>', 'start `commands` as an mcp server').action(async c =>
    {
        const container = containers.resolve<Container<unknown>>(c.options.commands);
        if (container)
            return await McpTrigger.register(container, c.abort.signal);

        if (URL.canParse(c.options.commands))
        {
            const options: Processors.DiscoveryOptions = {};
            const meta = await Processors.FileSystem.discoverMetaCommands(new URL(c.options.commands), options);

            const container = new Container(meta.name, {});
            registerCommands(meta.commands, options.processor, container);

            return await McpTrigger.register(container, c.abort.signal);
        }

        throw new ErrorWithStatus(HttpStatusCode.BadRequest, `${c.options.commands} could not be resolved to a valid container. It has to be a name registered with \`akala commands add\` or a valid URL.`)
    });
}
