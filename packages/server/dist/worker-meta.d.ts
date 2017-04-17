/// <reference types="socket.io-client" />
/// <reference types="express" />
import { Request as BaseRequest, WorkerRouter as Router, Callback } from './router';
import * as di from '@akala/core';
import * as express from '@types/express';
export { Router, Callback };
export declare type MasterRegistration = (from?: string, masterPath?: string, workerPath?: string) => void;
export interface resolve {
    (param: '$http'): di.Http;
    (param: '$request'): Request;
    (param: '$callback'): Callback;
    (param: '$router'): Router;
    (param: '$io'): (namespace: string) => SocketIOClient.Socket;
    (param: '$bus'): SocketIOClient.Socket;
    (param: '$master'): MasterRegistration;
    (param: string): any;
}
export interface WorkerInjector extends di.Injector {
    resolve: resolve;
}
export interface Request extends BaseRequest {
    injector: WorkerInjector;
}
export declare function expressWrap(handler: express.RequestHandler): (req: Request, next: (error?: any, ...args: any[]) => void) => void;
