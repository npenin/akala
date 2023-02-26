import Configuration from '../configuration.js';

export default async function (configPath?: string)
{
    const configuration = await Configuration.load(configPath || '~/config.json');
    Object.setPrototypeOf(this, configuration);
}