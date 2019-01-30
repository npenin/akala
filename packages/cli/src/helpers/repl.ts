import program from '../router';
import { resolve } from 'path';
import * as repl from 'repl'

export function replEval(input: string): string[] {
    var args: string[] = [];
    var match: RegExpExecArray;
    var arg = '';
    var indexOfDQuotes = -1, indexOfQuotes = -1, indexOfSpace = -1;
    var regex = /(["' $])/g;
    while (match = regex.exec(input)) {
        switch (match[1]) {
            case '\'':
                if (~indexOfDQuotes && indexOfDQuotes < indexOfQuotes) {
                    arg += input.substring(indexOfQuotes + 1, match.index)
                    indexOfQuotes = -1;
                }
                else if (!~indexOfQuotes) {
                    indexOfQuotes = match.index;
                    if (indexOfSpace + 1 < indexOfQuotes)
                        arg += input.substring(Math.max(indexOfSpace, indexOfDQuotes) + 1, match.index);
                }
                else {
                    arg += input.substring(indexOfQuotes + 1, match.index);
                    indexOfQuotes = -1;
                }

                break;
            case '"':
                if (~indexOfQuotes && indexOfQuotes < indexOfDQuotes) {
                    arg += input.substring(indexOfDQuotes + 1, match.index);
                    indexOfDQuotes = -1;
                }
                else if (!~indexOfDQuotes) {
                    indexOfDQuotes = match.index;
                    if (indexOfSpace + 1 < indexOfDQuotes)
                        arg += input.substring(Math.max(indexOfSpace, indexOfQuotes) + 1, match.index);
                }
                else {
                    arg += input.substring(indexOfDQuotes + 1, match.index);
                    indexOfDQuotes = -1;
                }
                break;
            case ' ':
                if (!~indexOfQuotes && !~indexOfDQuotes) {
                    if (!arg)
                        arg = input.substring(indexOfSpace + 1, match.index);
                    args.push(arg);
                    indexOfSpace = match.index;
                    arg = '';
                }
                else {
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

var replStarted = false;

program.command('repl')
    .action(function (context) {

        if (replStarted) {
            console.log('repl is already started');
            return Promise.resolve(null);
        }

        replStarted = true;

        var server = repl.start(Object.assign(context as any || {}, {
            eval: function (input: string, context, file, cb) {

                try {
                    var result = program.process(replEval(input));
                    if (result && result.then) {
                        result.then(function () {
                            cb();
                        }, cb);
                    }
                    else
                        cb();
                }
                catch (e) {
                    cb(e);
                }
            }
        }));
    })