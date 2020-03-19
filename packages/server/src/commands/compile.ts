import * as fs from 'fs'
import { eachAsync } from '@akala/core';
import { State } from '../state';

export default function compile(this: State, target: string, throwOnMissingFile?: boolean, ...inputs: string[])
{
    return new Promise<void>((resolve, reject) =>
    {
        var output = fs.createWriteStream(target);
        eachAsync(inputs, function (inputFile, _i, next)
        {
            fs.exists(inputFile, function (exists)
            {
                if (!exists)
                    if (throwOnMissingFile)
                        return next(new Error(`'${inputFile}' does not exist`));
                    else
                        return next();
                let input = fs.createReadStream(inputFile);
                input.pipe(output, { end: false });
                input.on('error', next);
                input.on('end', function ()
                {
                    output.write('\n', next);
                });
            });
        }, function (error)
        {
            if (error)
                reject(error);
            else resolve();
        })
    });
}