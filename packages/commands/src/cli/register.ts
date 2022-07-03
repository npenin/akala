import fs from 'fs';
import path from 'path';
import * as os from 'os'


export default async function register(commandsPath?: string, name?: string, force?: boolean)
{
    if (typeof (commandsPath) == 'undefined')
        if (fs.existsSync('./commands.json'))
            commandsPath = './commands.json';
        else
            throw new Error('please specify commands path');

    let packagePath = 'package.json';
    while (!fs.existsSync(packagePath))
    {
        packagePath = '../' + packagePath;
    }

    if (!fs.existsSync(packagePath))
    {
        let depth = process.cwd().length - process.cwd().replace('/', '').length;
        if (os.platform() != "win32")
            depth - 1;
        for (; depth > 0; depth--, packagePath = '../' + packagePath)
        {
            if (fs.existsSync(packagePath))
                break;
        }
        if (!fs.existsSync(packagePath))
            throw new Error('Unable to find package.json file in current folder or any of its parent');
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const packageFile = require(path.join(process.cwd(), packagePath));
    let dirty = false;
    if (typeof (name) != 'undefined' && name !== packageFile.name)
    {
        if (typeof (packageFile.commands) == 'string' || typeof (packageFile.commands) == 'undefined')
        {
            // if (commandsPath == packageFile.commands)
            //     console.log('no change to perform; this path is already registered');
            // else
            // {
            const commands: Record<string, string> = {};
            if (packageFile.commands)
                commands[packageFile.name] = packageFile.commands;
            commands[name] = commandsPath
            packageFile.commands = commands;
            dirty = true;
            // }
        }
        else
        {
            if (packageFile.commands[name] === commandsPath)
                console.log('no change to perform; this path is already registered');
            else if (typeof packageFile.commands[name] != 'undefined' && !force)
                throw new Error(`${name} already is registered as commands. Please use -f flag or find another name`);
            else
                packageFile.commands[name] = commandsPath, dirty = true;
        }
    }
    else
    {
        if (typeof (packageFile.commands) == 'string' || typeof packageFile.commands == 'undefined')
        {
            if (packageFile.commands === commandsPath)
                console.log('no change to perform; this path is already registered');
            else if (typeof packageFile.commands != 'undefined' && !force)
                throw new Error(`There already is a registered commands file. Please use -f flag or give it a name using --name`);
            else
                packageFile.commands = commandsPath, dirty = true;
        }
        else
        {
            if (packageFile.commands[packageFile.name] && packageFile.commands[packageFile] != commandsPath && !force)
                throw new Error(`There already is a registered commands file. Please use -f flag or give it a name using --name`);
            else if (packageFile.commands[packageFile.name] === commandsPath)
                console.log('no change to perform; this path is already registered');
            else
                packageFile.commands[packageFile.name] = commandsPath, dirty = true;
        }
    }

    if (dirty)
        await fs.promises.writeFile(path.join(process.cwd(), packagePath), JSON.stringify(packageFile, null, 4));
}