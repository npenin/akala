import * as r from '../router'
import { NextFunction as Next } from '../eachAsync'

type handlerType = ({ url: string, params: any }, next: Next) => void;
type errorhandlerType = (error: any, { url: string, params: any }, next: Next) => void;

type Layer = r.Layer<handlerType> & r.IRoutable<handlerType>;

class Router extends r.Router<handlerType, errorhandlerType, Layer, r.Route<handlerType, Layer>>
{
    constructor(options?: r.RouterOptions)
    {
        super(options);
    }
    protected buildLayer(path: string, options: r.LayerOptions, handler: handlerType): Layer
    {
        return <any>new r.Layer<handlerType>(path, options, handler);
    }
    protected buildRoute(path: string): r.Route<handlerType, Layer>
    {
        return new r.Route<handlerType, Layer>(path);
    }
}

var router = new Router();

debugger;
router.use('/api/', function (req, next: Next)
{
    console.log('api');
    next();
})

var ra = new Router();

var rb = new Router();

ra.use('/:id?', function (req, next)
{
    console.log('a' + req.url);
    console.log(req.params);
})

rb.use('/:id?', function (req, next)
{
    console.log('b' + req.url);
    console.log(req.params);
})

router.use('/api/a', ra.router);
router.use('/api/b', rb.router);

// router.handleRoute({ path: '/' });
// router.handleRoute({ path: '/a' });
// router.handleRoute({ path: '/api/pwic' });
router.handle(<any>{ url: '/api/a' }, function ()
{
    console.log('failed');
});
// router.handle({ url: '/api/a/pwic' }, function ()
// {
//     console.log('failed');
// });
// router.handleRoute({ path: '/api/b' });
// router.handleRoute({ path: '/api/b/pwic' });