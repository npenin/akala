import { get } from 'node:https';
import { Loader, Resolver, ResolverResult } from '../../index.js';
import fs from 'node:fs'
import { pathToFileURL } from 'url'
import path from 'path'

export const protocolParser = /^([a-z0-9-\+]+):(.+)$/;

export const resolve: Resolver = async function (specifier, context, nextResolve)
{
    // For JavaScript to be loaded over the network, we need to fetch and
    // return it.
    const parseResult = protocolParser.exec(specifier)
    if (!parseResult)
        return nextResolve(specifier, context);

    const protocols = parseResult[1].split('+');
    if (protocols.length == 1)
        return nextResolve(specifier, context);

    return protocols.reduceRight((previous, protocol) =>
        previous.then(async previous =>
        {
            const parseResult = protocolParser.exec(previous.url)
            if (!parseResult)
                return nextResolve(protocol + ':' + previous.url, context);

            if (parseResult[1] !== 'file')
                console.warn(`The specifier '${previous.url} already has a protocol and is about to be added another one, this might be hazardous...`);



            return await nextResolve(protocol + '+' + previous.url, context);
        })
        , Promise.resolve({ url: parseResult[2] }));
}