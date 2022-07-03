import configuration from "..";

export default async function set(this: configuration, key: string, newConfig: unknown, file?: string)
{
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let config = this;
    if (file)
        config = await configuration.load(file);

    config.set(key, newConfig);
}