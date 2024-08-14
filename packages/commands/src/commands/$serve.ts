import serve from '../cli/serve.js';
import serveMetadata, { ServeMetadataWithSignal } from '../serve-metadata.js';
import { Container } from '../model/container.js';
import { ServeOptions } from '../index.js';

export default async function $serve(container: Container<unknown>, options: ServeOptions | ServeMetadataWithSignal, signal?: AbortSignal)
{

    if ('args' in options)
        options = serveMetadata(options);
    if (signal)
        options.signal = signal;

    signal = options.signal;
    await serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
