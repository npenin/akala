import * as akala from '@akala/server';
import * as path from 'path'

var moduleName = require('../../package.json').name
var router = akala.router();

akala.module<void>('$isModule', '$master', '$router')(function (isModule: akala.worker.IsModule, master: akala.worker.MasterRegistration, router: akala.worker.Router)
{
    if (isModule(moduleName))
        master(__filename, './master');
    else
        akala.worker.handle(router, '/pages')
});

export function register(pageUrl: string, clientOrHandler: akala.api.Client<typeof akala.master.metaRouter> | akala.worker.RequestHandler)
{
    if (typeof (clientOrHandler) == 'function')
    {
        akala.exec<void>('$router', '$api.pages')(function (router: akala.worker.Router, pages: akala.api.Client<typeof akala.master.metaRouter>)
        {
            pages.$proxy().register({ path: pageUrl, remap: path.join('/pages/', pageUrl) });
            router.use(path.join('/pages/', pageUrl), clientOrHandler);
        })
    }
    else
        clientOrHandler.$proxy().register({ path: pageUrl, remap: '/' });
}