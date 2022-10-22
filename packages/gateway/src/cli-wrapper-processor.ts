import { CliContext, unparse, unparseWithMeta } from '@akala/cli';
import * as ac from '@akala/commands'
import { Local } from '@akala/commands/src/processors/local';
import { MiddlewarePromise, MiddlewareResult } from '@akala/core';
import { Deferred } from '@akala/json-rpc-ws';
import { spawn } from 'child_process'

export default class CliGatewayProcessor extends ac.CommandProcessor
{
    constructor(private bin: string)
    {
        super("cli-gateway");
    }

    public handle(origin: ac.Container<unknown>, cmd: ac.Metadata.Command, param: ac.StructuredParameters<[CliContext]>): MiddlewarePromise
    {
        var args = unparseWithMeta(cmd.config.cli.options, param.param[0]);
        var d = new Deferred<MiddlewareResult, unknown>();
        var cp = spawn(this.bin, args, { stdio: ['inherit', 'pipe', 'pipe'] });
        var stdout: Buffer[] = [];
        var stderr: Buffer[] = [];
        cp.stdout.on('data', chunk => stdout.push(chunk))
        cp.stderr.on('data', chunk => stderr.push(chunk))
        cp.on('exit', (code, signal) =>
        {
            if (code > 0)
                d.resolve(new Error(Buffer.concat(stderr).toString()));
            else
                d.reject(Buffer.concat(stdout).toString());
        })
        return d;
    }

}