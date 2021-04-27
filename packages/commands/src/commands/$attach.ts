import { metadata } from '../generator.js';
import { Container } from '../model/container.js';

export default function attach<T>(container: Container<T>, name: string, server: any)
{
    container.attach(name, server);
}

attach.$inject = ['$container'];
