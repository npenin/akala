import { buildCliContext } from '@akala/cli';

if (process.env.NO_AKALAPOSTINSTALL != '1')
{
    postinstall();
}

async function postinstall()
{
    const akala = await import('@akala/cli/cli').then(x => x.cli);
    akala(buildCliContext(null, 'plugins', 'add', '@akala/config/akala'))
    akala(buildCliContext(null, 'plugins', 'add', '@akala/commands/akala'))
    akala(buildCliContext(null, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))
}
