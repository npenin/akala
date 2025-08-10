import { ErrorWithStatus, HttpStatusCode, sequencify } from "@akala/core";
import { type LockFile, snapshot } from "../lockfile.js";
import { closest, type State } from "../state.js";
import { format } from "util";

export default async function (this: State, pkg: string | URL, signal?: AbortSignal)
{
    if (typeof pkg == 'string' && !URL.canParse(pkg))
        throw new Error('only URLs are supported');

    pkg = new URL(pkg);

    this.logger.info(`Why is ${pkg} installed?`);
    let tasks = {};
    try
    {
        const lock = await this.fs.readFile('apm.lock', { encoding: 'utf-8' }).then(l => JSON.parse(l) as LockFile, async e =>
        {
            if (e.statusCode === 404)
                return await snapshot(await (await closest(this.fs, 'package.json')).readFile('utf-8').then(JSON.parse), this, { __metadata: { version: 0 }, packages: {} });
            throw e;
        })
        await closest(this.fs, 'package.json').then(async pkgFile =>
        {
            const pkgJson = JSON.parse(await pkgFile.readFile('utf-8'));
            tasks['workspace:' + pkgJson.name + '/' + pkgJson.version] = { dep: [] };
        })
        // tasks = Object.fromEntries(Object.entries(lock.packages).map(([key, pkg]) => [key, { dep: [] }]));
        for (const [key, pkg] of Object.entries(lock.packages))
        {
            for (const depType of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'testDependencies'])
            {
                if (pkg[depType])
                {
                    for (const dep in pkg[depType])
                    {
                        if (pkg[depType][dep] in tasks)
                            tasks[pkg[depType][dep]].dep.push(key);
                        else
                            tasks[pkg[depType][dep]] = { dep: [key] };
                    }
                }
            }
        }
    }
    catch (e)
    {
        console.error(`Error while processing package.json: ${e}`);
        throw e;
    }

    const result = sequencify(tasks, [pkg.toString()]);

    if (result.missingTasks.length)
        throw new ErrorWithStatus(HttpStatusCode.InternalServerError,
            'The lock file is missing some packages. ' +
            'It is recommended to delete it and run `install` again. Missing packages:\n' +
            format(result.missingTasks)
        );

    if (result.recursiveDependencies?.length)
        return result.recursiveDependencies;

    return result.sequence;
}


