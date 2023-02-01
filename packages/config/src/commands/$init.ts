import Configuration from '../configuration.js';
import revert from './revert.js';

export default async function (configPath?: string)
{
    revert.call(this, configPath).catch((reason) =>
    {
        console.error(reason);
        Object.setPrototypeOf(this, Configuration.new(configPath || './config.json'));
    });
}