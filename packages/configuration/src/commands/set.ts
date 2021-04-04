import Configuration from "..";

export default async function set(key: string, newConfig: any, file?: string)
{
    let config = this;
    if (file)
        config = await Configuration.load(file);

    config.set(key, newConfig);
}