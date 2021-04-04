import * as http from 'http';
import * as akala from '@akala/core';
import accepts from 'accepts'
import cobody from 'co-body'

export type httpHandler = (req: Request, res: Response) => void;

export type requestHandler = (req: Request, res: Response) => Promise<unknown>;

export type errorHandler = (error: unknown, req: Request, res: Response) => Promise<unknown>;


export interface Methods<T>
{
    'checkout': T
    'connect': T
    'copy': T
    'delete': T
    'get': T
    'head': T
    'lock': T
    'm-search': T
    'merge': T
    'mkactivity': T
    'mkcalendar': T
    'mkcol': T
    'move': T
    'notify': T
    'options': T
    'patch': T
    'post': T
    'prop': T
    'find': T
    'proppatch': T
    'purge': T
    'put': T
    'report': T
    'search': T
    'subscribe': T
    'trace': T
    'unlock': T
    'unsubscribe': T
}

type Arguments1<T extends (...args: unknown[]) => unknown> = T extends (_arg1: unknown, _arg2: infer X, ...args: unknown[]) => unknown ? X : never;

export interface RequestBody
{
    json<T>(options?: Arguments1<typeof cobody.json>): Promise<T>;
    form<T>(options?: Arguments1<typeof cobody.form>): Promise<T>;
    text(options?: Arguments1<typeof cobody.text>): Promise<string>;
    parse<T>(options?: Arguments1<typeof cobody>): Promise<T>;
}

export interface Request extends http.IncomingMessage, akala.Routable
{
    accepts: accepts.Accepts;
    ip: string;
    query: URLSearchParams;
    injector?: akala.Injector;
    body: RequestBody;
    cookies?: Record<string, string>;
}
export interface Response extends http.ServerResponse
{
    status(statusCode: number): Response;
    sendStatus(statusCode: number): Response;
    json(content: unknown): Response;
    redirect(url: string, redirectCode?: number): Response;
}
