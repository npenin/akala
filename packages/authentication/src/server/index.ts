import * as akala from '@akala/core';
import * as server from '@akala/server';


var moduleName = require('../../package.json').name;



akala.module(moduleName).ready(['$router'], function (router: server.HttpRouter)
{
    router.get('/api/me', function (req, res)
    {
        delete req.user.password;
        delete req.user.id;
        res(200, req.user);
    })
    require('./master');
});