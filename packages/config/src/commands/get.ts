import Configuration from '../configuration.js';

export default async function get(this: Configuration, key: string, file?: string)
{
    if (!file)
        return this.get(key);
    return (await Configuration.load(file)).get(key);
}