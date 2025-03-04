import * as fs from 'fs/promises';
import * as path from 'path';

export default async function updateFrontMatter(directory: string = 'packages/doc', parentTitle?: string): Promise<void>
{
    console.log('updating hierarchies in ' + directory);

    const files = await fs.readdir(directory, { withFileTypes: true });

    files.sort((a, b) => a.name == 'index.md' ? -1 : b.name == 'index.md' ? 1 : a.isDirectory() && b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1)
    if (directory.includes('_client'))
        console.log(files);
    if (files.length && files[0].name == 'index.md')
    {
        const file = files[0];
        const fullPath = path.join(directory, file.name);
        console.log('found ' + fullPath);
        const data = await fs.readFile(fullPath, 'utf8');
        let updatedContent: string = data;
        let hasFrontMatter = updatedContent.match(/^---\n.*---/s);
        let currentTitle: string;

        if (hasFrontMatter)
        {
            const parentMatch = updatedContent.match(/parent:\s*(.+)$/m);
            if (parentMatch && parentMatch[1] != parentTitle)
            {
                console.log(fullPath + ' has parent')
                updatedContent = updatedContent.substring(0, parentMatch.index) + `parent: ${parentTitle}\n` + updatedContent.substring(parentMatch.index + parentMatch[0].length);
            }
            else if (!parentMatch && parentTitle)
            {
                console.log(fullPath + ' does not have parent')
                updatedContent = updatedContent.substring(0, hasFrontMatter[0].length - 3) + `parent: ${parentTitle}\n---` + updatedContent.substring(hasFrontMatter[0].length);
            }

            const titleMatch = updatedContent.match(/title:\s*(.+)$/m);
            if (!titleMatch)
            {
                console.log(fullPath + ' does not have title')
                hasFrontMatter = updatedContent.match(/^---\n.*---/s);
                currentTitle = path.basename(directory);
                updatedContent = updatedContent.substring(0, hasFrontMatter[0].length - 3) + `title: ${currentTitle}\n---` + updatedContent.substring(hasFrontMatter[0].length);
            }
            else
                currentTitle = titleMatch[1];
        }
        else
        {
            console.log(fullPath + ' does not have front matter')
            if (parentTitle)
                updatedContent = data.replace(/^/s, `---\nparent: ${parentTitle}\ntitle: ${path.basename(directory)}\n---\n`);
            else
                updatedContent = data.replace(/^/s, `---\ntitle: ${path.basename(directory)}\n---\n`);
            currentTitle = path.basename(directory);
        }
        const navOrderMatch = updatedContent.match(/nav_order:\s*(\d+)$/m);

        if (updatedContent !== data)
            await fs.writeFile(fullPath, updatedContent, 'utf8');

        const parent = currentTitle;
        const navOrder = navOrderMatch ? parseInt(navOrderMatch[1], 10) : 1;

        for (const siblingFile of files)
        {
            if (siblingFile.name !== 'index.md' && siblingFile.name != 'getting-started.md' && siblingFile.name.endsWith('.md'))
            {
                const siblingPath = path.join(directory, siblingFile.name);
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
                    else if (!parentMatch && parentTitle)
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
                    updatedContent = updatedContent.replace(/^/s, `---\nparent: ${parent}\nnav_order: ${navOrder + 1}\n---\n`);

                if (updatedContent !== siblingData)
                    await fs.writeFile(siblingPath, updatedContent, 'utf8');
            }
        }

        for (var otherFile of files)
            if (otherFile.isDirectory())
                await updateFrontMatter(path.join(directory, otherFile.name), currentTitle);
    }
    else
        for (var file of files)
            if (file.isDirectory())
                await updateFrontMatter(path.join(directory, file.name));
}
