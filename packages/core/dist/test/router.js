"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const r = require("../router");
class Router extends r.Router {
    constructor(options) {
        super(options);
    }
    buildLayer(path, options, handler) {
        return new r.Layer(path, options, handler);
    }
    buildRoute(path) {
        return new r.Route(path);
    }
}
var router = new Router();
debugger;
router.use('/api/', function (req, next) {
    console.log('api');
    next();
});
var ra = new Router();
var rb = new Router();
ra.use('/:id?', function (req, next) {
    console.log('a' + req.url);
    console.log(req.params);
});
rb.use('/:id?', function (req, next) {
    console.log('b' + req.url);
    console.log(req.params);
});
router.use('/api/a', ra.router);
router.use('/api/b', rb.router);
// router.handleRoute({ path: '/' });
// router.handleRoute({ path: '/a' });
// router.handleRoute({ path: '/api/pwic' });
router.handle({ url: '/api/a' }, function () {
    console.log('failed');
});
// router.handle({ url: '/api/a/pwic' }, function ()
// {
//     console.log('failed');
// });
// router.handleRoute({ path: '/api/b' });
// router.handleRoute({ path: '/api/b/pwic' }); 
//# sourceMappingURL=router.js.map