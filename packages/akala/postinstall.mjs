if (process.env.NO_AKALAPOSTINSTALL != '1')
    await postinstall();

async function postinstall()
{
    const akala = await import('@akala/cli/cli').then(x => x.cli({ plugins: [] }));
    const { buildCliContext } = await import('@akala/cli');


    await akala.process(buildCliContext(null, 'plugins', 'add', '@akala/config/akala'))
    await akala.process(buildCliContext(null, 'plugins', 'add', '@akala/commands/akala'))
    await akala.process(buildCliContext(null, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))
}
