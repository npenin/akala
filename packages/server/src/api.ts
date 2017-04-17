import { Injector, injectWithName, NextFunction } from '@akala/core';
import { Request, Response } from './router';
import * as fs from 'fs';

export function command($inject: string[], f: Function)
{
    return function (request: Request, next: NextFunction)
    {
        var injector = <Injector>request['injector'];
        var injectable = injector.injectWithName($inject, f);
        injectable(this);
    }
}

export function registerCommandsIn(folder: string)
{
    fs.stat(folder, function (error, stats)
    {
        if (error)
        {
            console.error(error);
            return;
        }
        if (stats.isDirectory())
        {
            fs.readdir(folder, function (error, files)
            {
                if (error)
                {
                    console.error(error);
                    return;
                }
                files.forEach(function (file)
                {
                    require(file);
                })
            })
        }
    });
}