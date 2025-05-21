import program, { CliContext } from "@akala/cli";
import { StateConfiguration } from "../state.js";
import { connect, Container } from "@akala/commands";
import { platform } from "os";
import { Triggers } from "@akala/commands";
import { ProxyConfiguration } from "@akala/config";
import { eachAsync, HttpStatusCode } from "@akala/core";
import commands from "../container.js";

type CliOptions = { pmSock: string | number, tls: boolean };

export default async function (c: CliContext<CliOptions, ProxyConfiguration<{ pm?: StateConfiguration }>>)
{
    let container: Container<unknown>;

    if (typeof c.options.pmSock == 'string' && URL.canParse(c.options.pmSock))
        container = await connect(c.options.pmSock, c.abort.signal)
    else if (typeof c.options.pmSock == 'number')
        container = await connect("tcp://localhost:" + c.options.pmSock, c.abort.signal);
    else if (typeof c.options.pmSock == 'string')
        container = await connect("tcp://" + c.options.pmSock, c.abort.signal);
    else if (platform() == 'win32')
        container = await connect('unix://\\\\?\\pipe\\pm', c.abort.signal)
    else
    {
        const connectMapping = c.state?.pm?.mapping.pm?.connect;
        await eachAsync(connectMapping.extract(), async (config, connectionString) =>
        {
            if (container)
                return;
            try
            {
                c.logger.verbose('trying to connect to ' + connectionString);
                const url = new URL(connectionString);
                if (url.hostname == '0.0.0.0')
                    url.hostname = 'localhost';
                container = await connect(url, c.abort.signal, commands.meta);
            }
            catch (e)
            {
                c.logger.silly('failed to connect to ' + connectionString);
                c.logger.silly(e)
                if (e.statusCode == HttpStatusCode.BadGateway || e.code == 'ENOENT' || e.code == 'ECONNREFUSED')
                    return;
                c.logger.error(e);
                throw e;
            }

        })
    }

    if (container)
        await container.attach(Triggers.cli, program.command('pm'));
    // throw new ErrorWithStatus(HttpStatusCode.BadGateway, 'no connection option specified');

}
