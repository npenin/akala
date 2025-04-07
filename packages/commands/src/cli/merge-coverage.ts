import glob from 'fast-glob';
import { promises as fs } from 'fs';
import path, { dirname, join } from 'path';

const REPORTS_DIR_NAME = 'coverage';
const GREEN = '\x1b[32m%s\x1b[0m';
const BLUE = '\x1b[34m%s\x1b[0m';

/**
 * Fetches all lcov.info files from coverage directories, excluding node_modules.
 * @returns {Promise<string[]>} A promise that resolves with an array of file paths.
 */
export function getLcovFiles(pattern: string, output: string): Promise<string[]>
{
    return glob(pattern, { ignore: ['**/node_modules/**'], onlyFiles: true, cwd: output });
};

/**
 * Creates a temp directory for all the reports.
 * @returns {Promise<void>} A promise that resolves when the directory has been created.
 */
export async function createTempDir(output: string)
{
    console.log(BLUE, `Creating a temp ${REPORTS_DIR_NAME} directory…`);
    try
    {
        await fs.mkdir(output, { recursive: true });
        console.log(GREEN, 'Done!');
    } catch (err)
    {
        console.error('Error creating directory:', err);
    }
}

export default async function (inputs: string, output: string)
{
    try
    {
        // Fetch all lcov.info files
        const files = await getLcovFiles(inputs, output);
        console.log("files are", files);
        // Create temp directory
        await createTempDir(output);
        // Read all files and join their contents
        const mergedReport = (await Promise.all(files.map(async file =>
        {
            const contents = await fs.readFile(file, 'utf-8');
            return contents.replace(/^SF:(.+)$/mg, (_, filePath) =>
            {
                // console.log('file', file);
                // console.log('filePath', filePath);
                // console.log('dirname', join(output, dirname(file), filePath));
                return 'SF:' + join(output, dirname(file), filePath)
            })
        }
        ))).join('');
        console.log(BLUE, `Copying the coverage report…`);
        // Write the merged report to a new lcov.info file
        await fs.writeFile(path.resolve(output, `lcov.info`), mergedReport);
        console.log('Code coverage has been saved!');
    } catch (err)
    {
        console.error('Error:', err);
    }
}
