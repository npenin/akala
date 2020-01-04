import serve from "../cli/serve";
import { Container } from "../container";

export default function $serve(container: Container<any>, options: { port?: number, cert?: string, key?: string, _: ('local' | 'http' | 'ws')[] })
{
    return serve(container, options);
}

$serve.$inject = ['container', 'options'];
