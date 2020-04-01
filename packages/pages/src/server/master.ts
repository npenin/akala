import * as akala from '@akala/server'

akala.exec<void>('$preAuthenticationRouter')(function (router: akala.HttpRouter)
{
    akala.master.serveRouterAdvanced(router, '/pages', '/');
});