import { Layer, LayerOptions, Route, IRoutable } from '@akala/core';
import { HttpRoute } from './route';
export declare class HttpLayer<T extends Function> extends Layer<T> implements IRoutable<T> {
    method: string;
    route: Route<T, HttpLayer<T>>;
    constructor(path: string, options: LayerOptions, fn: T);
    isApplicable(req: any, route: HttpRoute<T>): boolean;
}
