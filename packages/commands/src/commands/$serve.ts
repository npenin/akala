import serve from '../cli/serve.js';
import serveMetadata from '../serve-metadata.js';
import { Container } from '../model/container.js';
import { ServeOptions } from '../index.js';

export default function $serve(container: Container<unknown>, options: ServeOptions)
{
    return serve(container, { ...serveMetadata(options), signal: new AbortSignal() });
}

$serve.$inject = ['$container', 'param.0'];
