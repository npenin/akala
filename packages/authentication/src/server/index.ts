import * as akala from '@akala/server';

var moduleName = require('../../package.json').name

akala.module(moduleName).run(['$router'], function (router: akala.worker.Router)
{
    router.get('/api/me', function (req, res)
    {
        delete req.user.password;
        delete req.user.id;
        res(200, req.user);
    })
    require('./master');
});