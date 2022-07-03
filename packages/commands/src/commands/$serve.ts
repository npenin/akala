import serve from '../cli/serve';
import { ServeMetadata } from '../serve-metadata';
import { Container } from '../model/container';

export default function $serve(container: Container<unknown>, options: ServeMetadata)
{
    return serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
