import serve from '../cli/serve.js';
import serveMetadata from '../serve-metadata.js';
import { Container } from '../model/container.js';
import { type ServeOptions } from '../index.js';

export default async function $serve(container: Container<unknown>, options: ServeOptions | string[], signal?: AbortSignal)
{
    // console.log(options);
    if (isServeOptions(options))
        await serve(container, serveMetadata(options), signal);
    else
        await serve(container, options, signal);
}

function isServeOptions(options: unknown): options is ServeOptions
{
    return typeof options === 'object' && 'args' in options;
}

$serve.$inject = ['$container', 'params.0', 'params.1'];
