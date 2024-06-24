import { Container } from '../model/container.js';

export default function attach<T>(container: Container<T>, name: string, server: unknown)
{
    container.attach(name, server);
}

attach.$inject = ['$container'];
