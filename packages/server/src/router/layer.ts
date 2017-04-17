import { Layer, LayerOptions, Route, IRoutable } from '@akala/core';
import { HttpRoute } from './route';

export class HttpLayer<T extends Function> extends Layer<T> implements IRoutable<T>
{
    public method: string;
    public route: Route<T, HttpLayer<T>>;
    constructor(path: string, options: LayerOptions, fn: T)
    {
        super(path, options, fn);

        if (!(this instanceof HttpLayer))
        {
            return new HttpLayer(path, options, fn)
        }

    }

    public isApplicable(req, route: HttpRoute<T>)
    {
        var method = req.method.toLowerCase();
        if (method === 'head' && !route.methods['head'])
        {
            method = 'get'
        }

        return !this.method || this.method === method
    }
}