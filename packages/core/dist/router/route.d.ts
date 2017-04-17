/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
import { Layer, LayerOptions } from './layer';
export interface IRoutable<T extends Function> {
    route: Route<T, Layer<T>>;
}
/**
 * Expose `Route`.
 */
export declare class Route<T extends Function, TLayer extends Layer<T>> {
    path: string;
    stack: TLayer[];
    constructor(path: string);
    dispatch(req: any, ...rest: any[]): any;
    buildLayer(path: string, options: LayerOptions, callback: T): TLayer;
    isApplicable(req: any): boolean;
    addHandler(postBuildLayer: (layer: TLayer) => TLayer, ...handlers: T[][]): any;
    addHandler(postBuildLayer: (layer: TLayer) => TLayer, ...handlers: T[]): any;
    addHandler(postBuildLayer: (layer: TLayer) => TLayer, ...handlers: (T | T[])[]): any;
}
