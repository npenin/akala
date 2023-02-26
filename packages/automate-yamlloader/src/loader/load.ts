import { Workflow } from "@akala/automate";
import yaml from 'yaml';
import { readFile } from 'fs/promises'

export default async function load(file: string): Promise<Workflow>
{
    return yaml.parse(await readFile(file, 'utf8'));
}