import * as fs from 'fs'
import * as path from 'path'

export function mkdirp(p: string, callback)
{
    fs.exists(p, function (exists)
    {
        if (!exists)
            mkdirp(path.dirname(p), function (err)
            {
                if (err)
                    callback(err);
                else
                    fs.mkdir(p, callback)
            });
        else
            callback();
    })
}
