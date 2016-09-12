import {Injector, injectWithName} from './injector';
import * as express from 'express';

export function command($inject: string[], f: Function)
{
    return function (request: express.Request, response: express.Response, next: express.NextFunction)
    {
        var injector = <Injector>request['injector'];
        injector.injectWithName($inject, f)(this);
    }
}