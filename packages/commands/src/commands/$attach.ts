import { metadata } from "../generator";
import { Container } from "../container";

export default function attach<T>(container: Container<T>, name: string, server: any)
{
    container.attach(name, server);
}

attach.$inject = ['container'];
