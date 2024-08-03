import * as server from '@akala/server';
import { NonPublicMiddleware } from './middlewares/authorize.js';
import { module } from '@akala/core'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const moduleName = require('../../package.json').name;

export const isAuthorized = new NonPublicMiddleware();

module(moduleName).ready(['$router'], function (router: server.HttpRouter)
{
    router.get('/api/me', function (req)
    {
        delete req.user.password;
        delete req.user.id;
        return Promise.resolve(req.user);
    })
    require('./master');
});