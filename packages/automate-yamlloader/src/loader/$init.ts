import { sidecar } from '@akala/pm'
import Configuration from '@akala/config'

export default async function (config: Configuration)
{
    const automate = await sidecar()['@akala/automate'];
    await automate.dispatch('register-loader', '.yml');
    await automate.dispatch('register-loader', '.yaml');
}