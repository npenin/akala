import { register } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

function generateWorkflowTests(filePath: string): string
{
    return `import { describe, it } from 'node:test';
import akala from '@akala/automate/akala';
import { program as cli, buildCliContext } from '@akala/cli'
import { logger as LoggerBuilder, LogLevels } from '@akala/core';

describe('Workflow: ${path.basename(filePath)}', () => {
    it('should be a run workflow', async () => {
        const logger = LoggerBuilder.use('node-test', LogLevels.info)

        akala({}, cli);

        process.argv.splice(2, 0, 'run')
        await cli.process(buildCliContext(logger, '--loader', '@akala/automate-yamlloader', '--file', '${fileURLToPath(filePath.replace(/'/g, '\\\''))}'));        
    });
});`;
}

export async function resolve(specifier: string, context: any, defaultResolve: any)
{
    // Resolve the module specifier
    const resolved = await defaultResolve(specifier, context, defaultResolve);

    // Optionally, modify the resolved URL
    if (path.extname(resolved.url) === '.yaml' || path.extname(resolved.url) === '.yml')
    {
        resolved.format = 'yaml-workflow';
    }

    return resolved;
}

export async function load(url: string, context: any, defaultLoad: any)
{
    // Handle .yaml and .yml files
    if (context.format == 'yaml-workflow')
    {
        return {
            format: 'module',
            source: generateWorkflowTests(url),
            shortCircuit: true,
        }
    }

    // Delegate to the default loader for other file types
    return defaultLoad(url, context, defaultLoad);
}

register(import.meta.url);
