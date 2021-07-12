import { sidecar } from "@akala/pm";
import yaml from 'yaml';
import { readFile } from 'fs/promises'

export default async function load(file: string)
{
    (await sidecar()['@akala/automate']).dispatch('load', yaml.parse(await readFile(file, 'utf8')))
}