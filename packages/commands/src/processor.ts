import * as akala from '@akala/core'
import { Command } from "./metadata";

export const Processors = akala.module('$serverless').register('processors', new akala.Injector());

export abstract class Processor
{
    abstract process(cmd: Command, ...param: any[]): any | PromiseLike<any>;
    constructor(public name: string) { }
}