export type Tasks = Record<string, Task>

export interface Task
{
    dep: string[]
}

function sequence(tasks: Tasks, names: string[], results: string[], missing: string[], recursive: string[][], nest: string[])
{
    names.forEach(function (name)
    {
        if (results.indexOf(name) !== -1)
        {
            return; // de-dup results
        }
        var node = tasks[name];
        if (!node)
        {
            missing.push(name);
        } else if (nest.indexOf(name) > -1)
        {
            nest.push(name);
            recursive.push(nest.slice(0));
            nest.pop();
        } else if (node.dep.length)
        {
            nest.push(name);
            sequence(tasks, node.dep, results, missing, recursive, nest); // recurse
            nest.pop();
        }
        results.push(name);
    });
}

// tasks: object with keys as task names
// names: array of task names
export default function sequencify(tasks: Tasks, names: string[])
{
    var results: string[] = []; // the final sequence
    var missing: string[] = []; // missing tasks
    var recursive: string[][] = []; // recursive task dependencies

    sequence(tasks, names, results, missing, recursive, []);

    if (missing.length || recursive.length)
    {
        results = []; // results are incomplete at best, completely wrong at worst, remove them to avoid confusion
    }

    return {
        sequence: results,
        missingTasks: missing,
        recursiveDependencies: recursive
    };
}