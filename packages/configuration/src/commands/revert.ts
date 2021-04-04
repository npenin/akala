import { Configuration } from "../configuration";

export default async function (configPath?: string)
{
    const configuration = await Configuration.load(configPath || '~/config.json');
    Object.setPrototypeOf(this, configuration);
}