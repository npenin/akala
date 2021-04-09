import Configuration from "..";

export default async function set(this: Configuration, key: string, newConfig: any, file?: string)
{
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let config = this;
    if (file)
        config = await Configuration.load(file);

    config.set(key, newConfig);
}