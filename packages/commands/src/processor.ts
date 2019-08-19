import * as akala from '@akala/core'
import { Command } from "./metadata";
import { Container } from './container';

export const Processors = akala.module('$serverless').register('processors', new akala.Injector());

export abstract class Processor<T>
{
    abstract process(cmd: Command, ...param: any[]): any | PromiseLike<any>;
    constructor(public name: string, protected container?: Container<T>) { }
}