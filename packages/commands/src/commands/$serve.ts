import serve from '../cli/serve';
import { ServeMetadataWithSignal } from '../serve-metadata';
import { Container } from '../model/container';

export default function $serve(container: Container<unknown>, options: ServeMetadataWithSignal)
{
    return serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
