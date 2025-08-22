import { sidecar } from '@akala/pm'
import type { Container } from '@akala/commands';

export default async function (container: Container<void>)
{
    const automate = await sidecar({})['@akala/automate'];
    await automate.dispatch('register-loader', '.yml', container);
    await automate.dispatch('register-loader', '.yaml', container);
}
