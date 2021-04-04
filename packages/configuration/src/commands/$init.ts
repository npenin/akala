import { Configuration } from "../configuration";
import revert from "./revert";

export default async function (configPath?: string)
{
    revert.call(this, configPath).catch((reason) =>
    {
        console.error(reason);
        Object.setPrototypeOf(this, new Configuration(configPath || './config.json'));

    });
}