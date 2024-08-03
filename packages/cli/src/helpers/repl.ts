import program, { ErrorMessage } from '../router/index.js';
import * as repl from 'repl'
import { buildCliContextFromContext } from '../index.js';

export function replEval(input: string): string[]
{
    const args: string[] = [];
    let match: RegExpExecArray;
    let arg = '';
    let indexOfDQuotes = -1, indexOfQuotes = -1, indexOfSpace = -1;
    const regex = /(["' $])/g;
    // eslint-disable-next-line no-cond-assign
    while (match = regex.exec(input))
    {
        switch (match[1])
        {
            case '\'':
                if (~indexOfDQuotes && indexOfDQuotes < indexOfQuotes)
                {
                    arg += input.substring(indexOfQuotes + 1, match.index)
                    indexOfQuotes = -1;
                }
                else if (!~indexOfQuotes)
                {
                    indexOfQuotes = match.index;
                    if (indexOfSpace + 1 < indexOfQuotes)
                        arg += input.substring(Math.max(indexOfSpace, indexOfDQuotes) + 1, match.index);
                }
                else
                {
                    arg += input.substring(indexOfQuotes + 1, match.index);
                    indexOfQuotes = -1;
                }

                break;
            case '"':
                if (~indexOfQuotes && indexOfQuotes < indexOfDQuotes)
                {
                    arg += input.substring(indexOfDQuotes + 1, match.index);
                    indexOfDQuotes = -1;
                }
                else if (!~indexOfDQuotes)
                {
                    indexOfDQuotes = match.index;
                    if (indexOfSpace + 1 < indexOfDQuotes)
                        arg += input.substring(Math.max(indexOfSpace, indexOfQuotes) + 1, match.index);
                }
                else
                {
                    arg += input.substring(indexOfDQuotes + 1, match.index);
                    indexOfDQuotes = -1;
                }
                break;
            case ' ':
                if (!~indexOfQuotes && !~indexOfDQuotes)
                {
                    if (!arg)
                        arg = input.substring(indexOfSpace + 1, match.index);
                    args.push(arg);
                    indexOfSpace = match.index;
                    arg = '';
                }
                else
                {
                    arg += input[0];
                }
                break;
        }
    }
    if (!arg)
        arg = input.substring(indexOfSpace + 1);
    args.push(arg);

    return args;
}

export default function (_config, mainprogram)
{
    let replStarted = false;

    program.command('repl')
        .action(function (context)
        {
            if (replStarted)
            {
                console.log('repl is already started');
                return Promise.resolve(null);
            }

            replStarted = true;

            repl.start(Object.assign(context as repl.ReplOptions || {}, {
                eval: async function (input: string, _context, file, cb)
                {
                    try
                    {
                        const result = await mainprogram.process(buildCliContextFromContext(context, ...replEval(input.trim())));
                        cb(null, result);
                    }
                    catch (e)
                    {
                        if (e instanceof ErrorMessage)
                        {
                            console.log(e.message);
                            cb();
                        }
                        else
                            cb(e);
                    }
                }
            }));
        })
}