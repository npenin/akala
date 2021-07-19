import fs from 'fs/promises'
import State from '../state';
import path from 'path'
import { Workflow } from '../automate';

export default async function (this: State, name: string, workflowFile: string)
{
    let workflow: Workflow;
    var extension = path.extname(workflowFile);
    switch (extension)
    {
        case '.json':
            const serializedWorkflow = await fs.readFile(workflowFile, 'utf8');
            workflow = JSON.parse(serializedWorkflow);
            break;
        default:
            if (!this.loaders[extension])
                throw new Error(path.extname(workflowFile) + 'is not a supported file extension for a workflow load');
            workflow = await this.loaders[extension].dispatch('load', workflowFile);
    }
    this.workflows[name] = workflow;
}