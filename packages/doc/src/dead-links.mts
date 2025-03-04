import fs from 'fs/promises';
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
    await fs.mkdir(filePath);
    console.log(`Created: ${filePath}`);
    return filePath;

}
// Function to create a blank file if it does not exist
async function createFileIfNotExists(path: string)
{
    const lastIndexOfHash = path.lastIndexOf('#');
    if (lastIndexOfHash > -1)
        return path.substring(0, lastIndexOfHash);
    console.log(`creating ${path}`)
    let filePath = path.endsWith('.md') ? path : (path + '.md');
    if (!await fs.access(filePath).then(() => true, () => false))
    {
        if (path.endsWith('/'))
            return createFileIfNotExists(path + 'index.md');
        const folder = await createFolderIfNotExists(dirname(path));
        filePath = join(folder, basename(path));
        console.log('testing ' + filePath);
        let stats = await fs.lstat(filePath).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
        if (stats)
            if (stats.isDirectory())
                filePath = join(folder, 'index.md');
            else if (stats.isFile())
                return;
            else
                throw new Error('Unsupported file type: ' + filePath);
        else
        {
            if (!filePath.endsWith('.md'))
            {
                console.log('testing ' + filePath + '.md');
                let stats = await fs.access(filePath + '.md').then(() => true, e => e.code === 'ENOENT' ? false : Promise.reject(e));
                if (stats)
                    return;
                console.log('testing ' + join(folder, '_' + basename(path)));
                stats = await fs.access(join(folder, '_' + basename(path))).then(() => true, e => e.code === 'ENOENT' ? false : Promise.reject(e));
                if (stats)
                    return createFileIfNotExists(join(folder, '_' + basename(path)));
                await fs.writeFile(filePath + '.md', '---\n---\n\n# *Coming soon...*\n');
                console.log(`Created: ${filePath}`);
            }
            else
            {
                await fs.writeFile(filePath, '---\n---\n\n# *Coming soon...*\n');
                console.log(`Created: ${filePath}`);
            }
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
        // console.log(`analyzing ${link}`)
        // Ignore external links
        if (link.startsWith('http') || link.startsWith('//')) continue;

        // Resolve the link to an absolute path
        const linkPath = resolve(dirname(filePath), link);

        // Check if the file exists, if not create it
        await createFileIfNotExists(link.endsWith('/') ? linkPath + '/' : linkPath);
    }
}

// Get all markdown files in the workspace
const markdownFiles = glob.sync('packages/doc/**/*.md');

// Process each markdown file
for (const file of markdownFiles)
{
    await processMarkdownFile(file);
}
