import { metadata } from "../generator";
import { Container } from "../container";

export default function <T>(container: Container<T>, name: string, server: any)
{
    container.attach(name, server);
}

exports.default.$inject = ['$injector'];
