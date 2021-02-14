import serve, { ServeOptions } from "../cli/serve";
import serveMetadata from "../serve-metadata";
import { Container } from "../model/container";

export default function $serve(container: Container<any>, options: ServeOptions)
{
    return serve(container, serveMetadata(container.name, options));
}

$serve.$inject = ['$container', 'options'];
