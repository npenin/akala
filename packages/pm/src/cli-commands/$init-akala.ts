import program, { CliContext } from "@akala/cli";
import { StateConfiguration } from "../state.js";
import { connect, Container } from "@akala/commands";
import { platform } from "os";
import { Triggers } from "@akala/commands";
import { ProxyConfiguration } from "@akala/config";
import { ErrorWithStatus, HttpStatusCode } from "@akala/core";

type CliOptions = { pmSock: string | number, tls: boolean };

export default async function (c: CliContext<CliOptions, ProxyConfiguration<{ pm?: StateConfiguration }>>)
{
    let container: Container<unknown>;

    process.stdin.pause();
    process.stdin.setEncoding('utf8');

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
        const connectOptions = c.state?.pm?.mapping?.pm?.connect?.extract();
        if (connectOptions)
            container = await connect(Object.keys(connectOptions)[0], c.abort.signal);
    }

    if (!container)
        throw new ErrorWithStatus(HttpStatusCode.BadGateway, 'no connection option specified');

    await container.attach(Triggers.cli, program.command('pm'));
}