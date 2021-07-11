import fs from 'fs/promises'
import State from '../state';
import path from 'path'
import { Workflow } from '../automate';
import YAML from 'yaml';

export default async function (this: State, name: string, workflowFile: string)
{
    const serializedWorkflow = await fs.readFile(workflowFile, 'utf8');
    let workflow: Workflow;
    switch (path.extname(workflowFile))
    {
        case '.json':
            workflow = JSON.parse(serializedWorkflow);
            break;
        case '.yml':
        case '.yaml':
            workflow = YAML.parse(serializedWorkflow);
            break;
        default:
            throw new Error(path.extname(workflowFile) + 'is not a supported file extension for a workflow load');
    }
    this.workflows[name] = workflow;
}