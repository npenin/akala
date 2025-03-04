import * as fs from 'fs/promises';
import * as path from 'path';

export default async function updateFrontMatter(directory: string = 'packages/doc'): Promise<void>
{
    try
    {
        const files = await fs.readdir(directory);

        for (const file of files)
        {
            const indexPath = path.join(directory, file);
            if (file === 'index.md')
            {
                const data = await fs.readFile(indexPath, 'utf8');

                const titleMatch = data.match(/title:\s*(\w+)/);
                const navOrderMatch = data.match(/nav_order:\s*(\d+)/);

                if (titleMatch && navOrderMatch)
                {
                    const parent = titleMatch[1];
                    const navOrder = parseInt(navOrderMatch[1], 10);

                    for (const siblingFile of files)
                    {
                        if (siblingFile !== 'index.md' && siblingFile.endsWith('.md'))
                        {
                            const siblingPath = path.join(directory, siblingFile);
                            const siblingData = await fs.readFile(siblingPath, 'utf8');

                            const newFrontMatter = `parent: ${parent}\nnav_order: ${navOrder}\n`;
                            const updatedContent = siblingData.replace(/---\n.*?\n---/s, `---\n${newFrontMatter}---`);

                            await fs.writeFile(siblingPath, updatedContent, 'utf8');
                        }
                    }
                }
            }
            if ((await fs.stat(indexPath)).isDirectory())
                await updateFrontMatter(indexPath);
        }
    } catch (err)
    {
        console.error(`Error: ${err}`);
    }
}
