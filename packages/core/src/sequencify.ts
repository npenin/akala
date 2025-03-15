/** Map of tasks where keys are task names */
export type Tasks = Record<string, Task>;

/** 
 * Task definition for sequencify operations 
 * @property dep - Array of task dependencies
 */
export interface Task
{
    dep: string[]
}

/**
 * Recursively processes tasks to build execution sequence
 * @param tasks - Map of all tasks
 * @param names - Names of tasks to process
 * @param results - Accumulator for final execution order
 * @param missing - Accumulator for missing tasks
 * @param recursive - Accumulator for recursive dependencies
 * @param nest - Current dependency chain being processed
 */
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

/**
 * Creates an execution sequence for tasks with dependencies
 * @param tasks - Map of tasks where keys are task names
 * @param names - Array of task names to sequence
 * @returns Object containing:
 * - sequence: Ordered execution plan
 * - missingTasks: Tasks not found in the tasks map
 * - recursiveDependencies: Detected circular dependencies
 * @example
 * const tasks = {
 *   build: { dep: ['lint'] },
 *   lint: { dep: [] }
 * };
 * sequencify(tasks, ['build']); // Returns { sequence: ['lint', 'build'] }
 */
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
