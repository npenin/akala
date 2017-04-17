/// <reference types="node" />
import * as url from 'url';
import * as akala from '@akala/core';
export declare class Request implements akala.Request {
    constructor(loc: Location);
    url: string;
    uri: url.Url;
    params: {
        [key: string]: any;
    };
}
export declare type browserHandler = (req: Request, next: akala.NextFunction) => void;
export declare class BrowserLayer extends akala.Layer<browserHandler> implements akala.IRoutable<browserHandler> {
    route: akala.Route<browserHandler, BrowserLayer>;
    constructor(path: string, options: akala.LayerOptions, handler: browserHandler);
}
export declare class BrowserRoute extends akala.Route<browserHandler, BrowserLayer> {
    constructor(path: string);
    buildLayer(path: string, options: akala.LayerOptions, callback: browserHandler): BrowserLayer;
}
export declare class Router extends akala.Router<browserHandler, BrowserLayer, BrowserRoute> {
    constructor(options?: akala.RouterOptions);
    protected buildLayer(path: string, options: akala.LayerOptions, handler: browserHandler): BrowserLayer;
    protected buildRoute(path: string): BrowserRoute;
}
export declare function router(): Router;
