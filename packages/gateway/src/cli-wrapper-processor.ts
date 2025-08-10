import { type CliContext, unparseWithMeta } from '@akala/cli';
import * as ac from '@akala/commands'
import { type MiddlewarePromise, type MiddlewareResult, Deferred } from '@akala/core';
import { spawn } from 'child_process'

export default class CliGatewayProcessor extends ac.CommandProcessor
{
    constructor(private readonly bin: string)
    {
        super("cli-gateway");
    }

    public handle(_origin: ac.Container<unknown>, cmd: ac.Metadata.Command, param: ac.StructuredParameters<[CliContext]>): MiddlewarePromise
    {
        const args = unparseWithMeta(cmd.config.cli, param.params[0]);
        if (cmd.config.cli.usage)
        {
            cmd.config.cli.usage
        }
        const d = new Deferred<MiddlewareResult, unknown>();
        const cp = spawn(this.bin, args, { stdio: ['inherit', 'pipe', 'pipe'], shell: true });
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        cp.stdout.on('data', chunk => stdout.push(chunk))
        cp.stderr.on('data', chunk => stderr.push(chunk))
        cp.on('exit', (code) =>
        {
            if (code > 0)
                d.resolve(new Error(Buffer.concat(stderr).toString()));
            else
                d.reject(Buffer.concat(stdout).toString());
        })
        return d;
    }

}
