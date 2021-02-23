import serve, { ServeOptions } from "../cli/serve";
import serveMetadata, { ServeMetadata } from "../serve-metadata";
import { Container } from "../model/container";

export default function $serve(container: Container<any>, options: ServeMetadata)
{
    return serve(container, options);
}

$serve.$inject = ['$container', 'param.0'];
