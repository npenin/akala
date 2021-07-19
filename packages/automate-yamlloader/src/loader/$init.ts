import { sidecar } from '@akala/pm'
import { Container } from '@akala/commands';

export default async function (container: Container<void>)
{
    const automate = await sidecar({ container: container })['@akala/automate'];
    await automate.dispatch('register-loader', '.yml');
    await automate.dispatch('register-loader', '.yaml');
}