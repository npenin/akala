/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
import { Layer, LayerOptions } from './layer';
import { Route, IRoutable } from './route';
export { Layer, Route, LayerOptions, IRoutable };
export declare type RoutableLayer<T extends Function> = Layer<T> & IRoutable<T>;
export interface RouterOptions {
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;
    length?: number;
}
export interface NextParamCallback {
    (error: any): void;
    (): void | any;
}
export declare type ParamCallback = (req, paramCallback: NextParamCallback, paramVal: any, name: string, ...rest) => void;
export interface Request {
    next?: NextFunction;
    baseUrl?: string;
    url?: string;
    params?: {
        [key: string]: any;
    };
    originalUrl?: string;
    route?: Route<any, Layer<any>>;
}
export interface NextFunction {
    (arg: 'router'): void;
    (arg: 'route'): void;
    (err: any): void;
    (): void;
}
export declare type Middleware1<T extends Request> = (req: T, next: NextFunction) => void;
export declare type Middleware2<T extends Request, U> = (req: T, res: U, next: NextFunction) => void;
export declare type ErrorMiddleware1<T extends Request> = (error: any, req: T, next: NextFunction) => void;
export declare type ErrorMiddleware2<T extends Request, U> = (error: any, req: T, res: U, next: NextFunction) => void;
export declare type Middleware1Extended<T extends Request> = Middleware1<T> | ErrorMiddleware1<T>;
export declare type Middleware2Extended<T extends Request, U> = Middleware2<T, U> | ErrorMiddleware2<T, U>;
export declare type Router1<T extends Request, TLayer extends RoutableLayer<Middleware1Extended<T>>, TRoute extends Route<Middleware1Extended<T>, TLayer>> = Router<Middleware1Extended<T>, TLayer, TRoute>;
export declare type Router2<T extends Request, U, TLayer extends RoutableLayer<Middleware2Extended<T, U>>, TRoute extends Route<Middleware2Extended<T, U>, TLayer>> = Router<Middleware2Extended<T, U>, TLayer, TRoute>;
export declare abstract class Router<T extends (Middleware1Extended<any> | Middleware2Extended<any, any>), TLayer extends (Layer<T> & IRoutable<T>), TRoute extends Route<T, TLayer>> {
    constructor(options: RouterOptions);
    private length;
    private caseSensitive;
    private mergeParams;
    private params;
    private strict;
    private stack;
    router: any;
    /**
     * Map the given param placeholder `name`(s) to the given callback.
     *
     * Parameter mapping is used to provide pre-conditions to routes
     * which use normalized placeholders. For example a _:user_id_ parameter
     * could automatically load a user's information from the database without
     * any additional code.
     *
     * The callback uses the same signature as middleware, the only difference
     * being that the value of the placeholder is passed, in this case the _id_
     * of the user. Once the `next()` function is invoked, just like middleware
     * it will continue on to execute the route, or subsequent parameter functions.
     *
     * Just like in middleware, you must either respond to the request or call next
     * to avoid stalling the request.
     *
     *  router.param('user_id', function(req, res, next, id){
     *    User.find(id, function(err, user){
     *      if (err) {
     *        return next(err)
     *      } else if (!user) {
     *        return next(new Error('failed to load user'))
     *      }
     *      req.user = user
     *      next()
     *    })
     *  })
     *
     * @param {string} name
     * @param {function} fn
     * @public
     */
    param(name: string, fn: ParamCallback): this;
    /**
     * Dispatch a req, res into the router.
     *
     * @private
     */
    handle(req: Request, ...rest: any[]): any;
    protected internalHandle(options: any, req: any, ...rest: any[]): void;
    process_params(layer: TLayer, called: any, req: any, ...rest: any[]): any;
    /**
     * Use the given middleware function, with optional path, defaulting to "/".
     *
     * Use (like `.all`) will run for any http METHOD, but it will not add
     * handlers for those methods so OPTIONS requests will not consider `.use`
     * functions even if they could respond.
     *
     * The other difference is that _route_ path is stripped and not visible
     * to the handler function. The main effect of this feature is that mounted
     * handlers can operate without any code changes regardless of the "prefix"
     * pathname.
     *
     * @public
     */
    use(...handlers: T[]): any;
    use(path: string, ...handlers: T[]): any;
    protected abstract buildLayer(path: string, options: LayerOptions, handler: T): TLayer;
    protected abstract buildRoute(path: string): TRoute;
    /**
     * Create a new Route for the given path.
     *
     * Each route contains a separate middleware stack and VERB handlers.
     *
     * See the Route api documentation for details on adding handlers
     * and middleware to routes.
     *
     * @param {string} path
     * @return {Route}
     * @public
     */
    route(path: string): TRoute;
    /**
     * Get pathname of request.
     *
     * @param {IncomingMessage} req
     * @private
     */
    static getPathname(req: any): any;
    /**
     * Match path to a layer.
     *
     * @param {Layer} layer
     * @param {string} path
     * @private
     */
    protected static matchLayer<T extends Function>(layer: Layer<T>, path: string): any;
    /**
     * Merge params with parent params
     *
     * @private
     */
    protected static mergeParams(params: any, parent: any): any;
    protected static restore(fn: any, obj: any, ...props: string[]): (...args: any[]) => any;
    protected static wrap(old: any, fn: any): () => void;
}
