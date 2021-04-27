import serve, { ServeOptions } from '../cli/serve.js';
import serveMetadata, { ServeMetadata } from '../serve-metadata.js';
import { Container } from '../model/container.js';

export default function $serve(container: Container<any>, options: ServeMetadata)
{
    return serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
