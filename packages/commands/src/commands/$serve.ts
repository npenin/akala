import serve from '../cli/serve.js';
import serveMetadata from '../serve-metadata.js';
import { Container } from '../model/container.js';
import { ServeOptions } from '../index.js';

export default async function $serve(container: Container<unknown>, options: ServeOptions, signal: AbortSignal)
{
    await serve(container, { ...serveMetadata(options), signal });
    return new Promise<void>((resolve, reject) => signal.addEventListener('abort', e => signal.reason ? reject(signal.reason) : resolve()));
}

$serve.$inject = ['$container', 'param.0'];
