import * as akala from '@akala/core';
import { ServiceWorker } from './service-worker'

process.on('uncaughtException', function (error)
{
    console.error(process.argv[2]);
    console.error(error);
    process.exit(500);
})

function resolveUrl(namespace: string)
{
    var url = process.argv[3] + '/' + namespace + '/';
    return url;
}

akala.register('$resolveUrl', resolveUrl);

var sw = akala.register('$worker', new ServiceWorker(undefined));

global['self'] = sw;

require.main.require(process.argv[2]);
