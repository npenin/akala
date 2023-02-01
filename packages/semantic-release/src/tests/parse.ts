import parse from '../commands/parse.js'
import fs from 'fs/promises'
import path from 'path'

(async function ()
{
    const content = await fs.readFile(path.resolve(__dirname, '../../git-log.txt'), 'utf-8');
    console.log(await parse(content));
})();