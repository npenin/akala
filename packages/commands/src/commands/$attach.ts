import { Container } from '../model/container';

export default function attach<T>(container: Container<T>, name: string, server: unknown)
{
    container.attach(name, server);
}

attach.$inject = ['$container'];
