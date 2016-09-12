import * as express from 'express';
export declare function command($inject: string[], f: Function): (request: express.Request, response: express.Response, next: express.NextFunction) => void;
