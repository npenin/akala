import fs from 'fs/promises'
import { Configuration } from '../configuration';

export default function (this: Configuration, file?: string, formatted?: boolean)
{
    return this.commit(file, formatted);
}