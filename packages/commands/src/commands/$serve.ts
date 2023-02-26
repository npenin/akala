import serve from '../cli/serve.js';
import { ServeMetadataWithSignal } from '../serve-metadata.js';
import { Container } from '../model/container.js';

export default function $serve(container: Container<unknown>, options: ServeMetadataWithSignal)
{
    return serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
