import Configuration from '../configuration.js';

export default function (this: Configuration, file?: string, formatted?: boolean)
{
    return this.commit(file, formatted);
}