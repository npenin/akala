import fs, { mkdir } from 'fs/promises';
import { basename, dirname, join, resolve } from 'path/posix';
import glob from 'glob';
import markdownLinkExtractor from 'markdown-link-extractor';

// Function to create a blank file if it does not exist
async function createFolderIfNotExists(filePath: string): Promise<string>
{
    try
    {
        await fs.access(filePath);
        return filePath;
    }
    catch
    {
        const fragments = filePath.split('/');
        for (let i = 0; i < fragments.length; i++)
        {
            const newPath = fragments.map((v, j) => i == j ? '_' + v : v).join('/');
            console.log('testing ' + newPath);
            try
            {
                const stats = await fs.lstat(newPath);
                if (stats.isDirectory())
                    return newPath;
            }
            catch { }
        }
    }
    filePath = join(await createFolderIfNotExists(dirname(filePath)), basename(filePath));
    await mkdir(filePath);
    console.log(`Created: ${filePath}`);
    return filePath;

}
// Function to create a blank file if it does not exist
async function createFileIfNotExists(path: string)
{
    console.log(`creating ${path}`)
    let filePath = path.endsWith('.md') ? path : (path + '.md');
    try
    {
        await fs.access(filePath);
    } catch
    {
        const folder = await createFolderIfNotExists(path === filePath ? dirname(path) : path);
        if (folder + '.md' === filePath)
            filePath = join(folder, 'index.md');
        else if (folder.split('/').length == filePath.split('/').length)
            filePath = join(folder, 'index.md');
        else
            filePath = join(folder, basename(filePath));

        try
        {
            await fs.access(filePath);
            return;
        }
        catch
        {
            await fs.writeFile(filePath, '# *Coming soon...*\n');
            console.log(`Created: ${filePath}`);
        }
    }
}

// Function to process a markdown file
async function processMarkdownFile(filePath)
{
    const content = await fs.readFile(filePath, 'utf8');
    const links = markdownLinkExtractor(content);

    for (const link of links)
    {
        console.log(`analyzing ${link}`)
        // Ignore external links
        if (link.startsWith('http') || link.startsWith('//')) continue;

        // Resolve the link to an absolute path
        const linkPath = resolve(dirname(filePath), link);

        // Check if the file exists, if not create it
        await createFileIfNotExists(linkPath);
    }
}

// Get all markdown files in the workspace
const markdownFiles = glob.sync('packages/doc/**/*.md');

// Process each markdown file
for (const file of markdownFiles)
{
    await processMarkdownFile(file);
}
