import * as fs from 'fs'
import { eachAsync } from '@akala/core';
import { State } from '../state';
import { mkdirp } from '../helpers/mkdirp';
import * as path from 'path'

export default function compile(this: State, target: string, throwOnMissingFile?: boolean, ...inputs: string[])
{
    return new Promise<void>((resolve, reject) =>
    {
        mkdirp(path.dirname(target), () =>
        {
            if (!inputs || inputs.length === 0 || (inputs.length == 1 && !inputs[0]))
            {
                // console.log('looking for assets');
                inputs = this.assets.injectWithName([target], (assets: string[]) => assets)();
                target = path.join('./build', target);
            }

            // console.log('opening' + target);
            var output = fs.createWriteStream(target);

            console.log(`compiling ${target} with following inputs: ${inputs.join(',')}`)

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
                    // console.log('opening ' + inputFile)
                    input.on('error', next);
                    input.on('end', function ()
                    {
                        // console.log(`end of ${inputFile} reached`);
                        output.write('\n', next);
                    });
                    input.pipe(output, { end: false });
                });
            }, function (error)
            {
                output.close();
                if (error)
                    reject(error);
                else resolve();
            })
        });
    });
}