import * as fs from 'fs/promises';
import * as path from 'path';

export default async function updateFrontMatter(directory: string = 'packages/doc', parentTitle?: string): Promise<void>
{
    console.log('updating hierarchies in ' + directory);

    try
    {
        const files = await fs.readdir(directory);

        for (const file of files)
        {
            const fullPath = path.join(directory, file);
            if (file === 'index.md')
            {
                const data = await fs.readFile(fullPath, 'utf8');

                const titleMatch = data.match(/title:\s*(.+)$/m);
                const parentMatch = data.match(/parent:\s*(.+)$/m);
                const navOrderMatch = data.match(/nav_order:\s*(\d+)$/m);

                if (parentTitle && parentMatch?.[1] != parentTitle)
                {
                    const newFrontMatter = `parent: ${parent}\n`;
                    let updatedContent: string;
                    if (parentMatch)
                        updatedContent = data.substring(0, parentMatch.index) + newFrontMatter + data.substring(parentMatch.index + parentMatch[0].length);
                    else
                        updatedContent = data.replace(/^---\n/s, `---\n${newFrontMatter}`);

                    await fs.writeFile(fullPath, updatedContent, 'utf8');
                }

                if (titleMatch)
                {
                    const parent = titleMatch[1];
                    const navOrder = navOrderMatch ? parseInt(navOrderMatch[1], 10) : 1;

                    for (const siblingFile of files)
                    {
                        if (siblingFile !== 'index.md' && siblingFile != 'getting-started.md' && siblingFile.endsWith('.md'))
                        {
                            const siblingPath = path.join(directory, siblingFile);
                            const siblingData = await fs.readFile(siblingPath, 'utf8');

                            let updatedContent: string = siblingData;
                            let hasFrontMatter = updatedContent.match(/^---\n.*---/s);
                            if (hasFrontMatter)
                            {
                                const parentMatch = updatedContent.match(/parent:\s*(.+)$/m);
                                if (parentMatch && parentMatch[1] != parent)
                                {
                                    console.log(siblingPath + ' has parent')
                                    updatedContent = updatedContent.substring(0, parentMatch.index) + `parent: ${parent}\n` + updatedContent.substring(parentMatch.index + parentMatch[0].length);
                                }
                                else if (!parentMatch)
                                {
                                    console.log(siblingPath + ' does not have parent')
                                    updatedContent = updatedContent.substring(0, hasFrontMatter[0].length - 3) + `parent: ${parent}\n---` + updatedContent.substring(hasFrontMatter[0].length);
                                }

                                const navOrderMatch = updatedContent.match(/nav_order:\s*(\d+)$/m);
                                if (navOrderMatch && Number(navOrderMatch[1]) != navOrder + 1)
                                {
                                    console.log(siblingPath + ' has nav_order')
                                    updatedContent = updatedContent.substring(0, navOrderMatch.index) + `nav_order: ${navOrder + 1}` + updatedContent.substring(navOrderMatch.index + navOrderMatch[0].length);
                                }
                                else if (!navOrderMatch)
                                {
                                    console.log(siblingPath + ' does not have nav_order')
                                    hasFrontMatter = updatedContent.match(/^---\n.*---/s);
                                    updatedContent = updatedContent.substring(0, hasFrontMatter[0].length - 3) + `nav_order: ${navOrder + 1}\n---` + updatedContent.substring(hasFrontMatter[0].length);
                                }
                            }
                            else
                                updatedContent = data.replace(/^/s, `---\nparent: ${parent}\nnav_order: ${navOrder + 1}\n---\n`);

                            if (updatedContent !== siblingData)
                                await fs.writeFile(siblingPath, updatedContent, 'utf8');
                        }
                    }
                }
            }
            if ((await fs.stat(fullPath)).isDirectory())
                await updateFrontMatter(fullPath);
        }
    } catch (err)
    {
        console.error(`Error: ${err}`);
    }
}
