import serve from '../cli/serve.js';
import serveMetadata from '../serve-metadata.js';
import { Container } from '../model/container.js';
import { ServeOptions } from '../index.js';

export default async function $serve(container: Container<unknown>, options: ServeOptions | string[], signal?: AbortSignal)
{
    console.log(options);
    if ('args' in options)
        await serve(container, serveMetadata(options), signal);
    else
        await serve(container, options, signal);
}

$serve.$inject = ['$container', 'param.0', 'param.1'];
