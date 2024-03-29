import fs from 'fs/promises'
import https from 'https'

export default async function (pathToOpenApiFile: string | URL)
{
    if (typeof pathToOpenApiFile == 'string')
    {
        if (pathToOpenApiFile.indexOf(':') == -1)
            pathToOpenApiFile = 'file://' + pathToOpenApiFile;
        pathToOpenApiFile = new URL(pathToOpenApiFile);
    }
    let content: string;
    switch (pathToOpenApiFile.protocol)
    {
        case 'file:':
            content = await fs.readFile(pathToOpenApiFile.pathname, { encoding: 'utf8' });
            break;
        case 'https:':
            content = await new Promise((resolve, reject) =>
            {
                https.request(pathToOpenApiFile, res =>
                {
                    var chunks: Buffer[] = [];
                    res.on('data', chunk => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks).toString()));
                    res.on('error', reject);
                }).on('error', reject);
            });
            break;
        default:
            throw new Error('Unsupported URL scheme');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openApi = JSON.parse(content);


}