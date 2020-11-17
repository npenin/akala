import Configuration from "..";

export default async function set(key: string, newConfig: any, file?: string)
{
    var config = this;
    if (file)
        config = await Configuration.load(file);

    config.set(key, newConfig);
}