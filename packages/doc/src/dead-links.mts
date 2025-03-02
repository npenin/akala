import fs, { mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import glob from 'glob';
import markdownLinkExtractor from 'markdown-link-extractor';

// Function to create a blank file if it does not exist
async function createFileIfNotExists(path: string)
{
    const filePath = path.endsWith('.md') ? path : (path + '.md');
    console.log(`creating ${filePath}`)
    try
    {
        await fs.access(filePath);
    } catch
    {
        if (filePath !== path)
        {
            try
            {
                const stats = await fs.lstat(path);
                if (stats.isDirectory())
                    try
                    {
                        await fs.access(path + '/index.md');
                        return;
                    }
                    catch
                    {
                        await mkdir(dirname(path), { recursive: true });
                        await fs.writeFile(path + '/index.md', '');
                        console.log(`Created: ${path + '/index.md'}`);
                        return;
                    }
            }
            catch { }
        }
        await mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '# *Coming soon...*');
        console.log(`Created: ${filePath}`);
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
