// import * from 'akala-core';
export { Injector, Binding, Deferred as defer, ObservableArray } from 'akala-core'
import * as api from './dist/clientify'

export as namespace akala;

export { Router, BaseControl, LocationService, IScope, Template, Part, Control, Http } from './dist/clientify'

export function promisify<T>(o: T): PromiseLike<T>;
// export type Router = api.Router;
// export type Binding = Binding;
// export type LocationService = api.LocationService;
// export type IScope = api.IScope;
// export type defer<T> = Deferred<T>;
// export type ObservableArray<T> = ObservableArray<T>;
// export type Template = api.Template;
// export type Part = api.Part;
// export type Control<T> = api.Control<T>;
// export type BaseControl<T> = api.BaseControl<T>;
// export type Http = api.Http;

export function run(toInject: string[], f: Function): void;
export function control(...toInject: string[]): (ctrl: new (...args: any[]) => any) => void;
