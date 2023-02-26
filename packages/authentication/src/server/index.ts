import * as akala from '@akala/core';
import * as server from '@akala/server';
import { AuthorizeMiddleware } from './middlewares/authorize.js';


// eslint-disable-next-line @typescript-eslint/no-var-requires
const moduleName = require('../../package.json').name;

export const isAuthorized = new AuthorizeMiddleware();

akala.module(moduleName).ready(['$router'], function (router: server.HttpRouter)
{
    router.get('/api/me', function (req)
    {
        delete req.user.password;
        delete req.user.id;
        return Promise.resolve(req.user);
    })
    require('./master');
});