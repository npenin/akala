import Configuration from '../configuration.js';
import revert from './revert.js';

export default async function (configPath?: string)
{
    revert.call(this, configPath).catch(async (reason) =>
    {
        console.error(reason);
        Object.setPrototypeOf(this, await Configuration.newAsync(configPath || './config.json'));
    });
}