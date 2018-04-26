import { Proxy } from '../each'
import { extend } from '../helpers'

import * as debug from 'debug'
import { PayloadDataType, Payload } from '@akala/json-rpc-ws/lib/connection';

var log = debug('akala:metadata')
var clientLog = debug('akala:metadata:client');

export type TConfig = { [key: string]: any };

export interface IBuilder<TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>
{
    api: Api<TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>;
}

export interface IServerProxyBuilder<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay> extends IBuilder<TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    createServerProxy(client: T): Partial<TServerOneWayProxy & TServerTwoWayProxy>;
}

export interface IClientProxyBuilder<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay> extends IBuilder<TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    createClientProxy(client: T): Partial<TClientOneWayProxy & TClientTwoWayProxy>;
}

export interface IClientBuilder<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay> extends IBuilder<TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    createClientProxy(client: T): Partial<TClientOneWayProxy & TClientTwoWayProxy>;
    createClient(client: T): (clientImpl: TClientOneWay & TClientTwoWay, ...dummy: any[]) => TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> };
}

export class Api<
    TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    constructor()
    {
    }

    public serverOneWayConfig: Partial<{ [k in keyof (TServerOneWay | TServerOneWayProxy)]: TConfig }> = {};
    public serverTwoWayConfig: Partial<{ [k in keyof (TServerTwoWay | TServerTwoWayProxy)]: TConfig }> = {};
    public clientOneWayConfig: Partial<{ [k in keyof (TClientOneWay | TClientOneWayProxy)]: TConfig }> = {};
    public clientTwoWayConfig: Partial<{ [k in keyof (TClientTwoWay | TClientTwoWayProxy)]: TConfig }> = {};

    connection<TConnectionNew extends TConnection>(): Api<TConnectionNew, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return <any>this;
    }

    clientToServerOneWay<TIn>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConnection,
        TServerOneWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => PromiseLike<void> | void>,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<void>>,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverOneWayConfig = Object.assign(this.serverOneWayConfig, impl);
            return <any>this;
        }
    }

    clientToServer<TIn, TOut>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConnection,
        TServerOneWay,
        TServerTwoWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => TOut | PromiseLike<TOut>>,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverTwoWayConfig = Object.assign(this.serverTwoWayConfig, impl);
            return <any>this;
        }
    }

    serverToClientOneWay<TIn>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay & Proxy<TImpl, (p: TIn) => PromiseLike<void> | void>,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<void>>,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.clientOneWayConfig = Object.assign(this.clientOneWayConfig, impl);
            return <any>this;
        }
    }

    serverToClient<TIn, TOut>(): <TImpl>(impl: TImpl) => Api<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay & Proxy<TImpl, (p: TIn) => TOut | PromiseLike<TOut>>,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>>
    {
        return (impl) =>
        {
            this.clientTwoWayConfig = Object.assign(this.clientTwoWayConfig, impl);
            return <any>this;
        }
    }
}

export class DualApi<
    TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay,
    TOConnection,
    TOServerOneWay,
    TOServerTwoWay,
    TOClientOneWay,
    TOClientTwoWay,
    TOServerOneWayProxy extends TOServerOneWay,
    TOServerTwoWayProxy extends TOServerTwoWay,
    TOClientOneWayProxy extends TOClientOneWay,
    TOClientTwoWayProxy extends TOClientTwoWay>
    extends Api<
    TConnection & TOConnection,
    TServerOneWay & TOServerOneWay,
    TServerTwoWay & TOServerTwoWay,
    TClientOneWay & TOClientOneWay,
    TClientTwoWay & TOClientTwoWay,
    TServerOneWayProxy & TOServerOneWayProxy,
    TServerTwoWayProxy & TOServerTwoWayProxy,
    TClientOneWayProxy & TOClientOneWayProxy,
    TClientTwoWayProxy & TOClientTwoWayProxy>
{
    constructor(meta1: Api<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>,
        meta2: Api<
            TOConnection,
            TOServerOneWay,
            TOServerTwoWay,
            TOClientOneWay,
            TOClientTwoWay,
            TOServerOneWayProxy,
            TOServerTwoWayProxy,
            TOClientOneWayProxy,
            TOClientTwoWayProxy>)
    {
        super();
        this.clientOneWayConfig = Object.assign(meta1.clientOneWayConfig, meta2.clientOneWayConfig);
        this.clientTwoWayConfig = Object.assign(meta1.clientTwoWayConfig, meta2.clientTwoWayConfig);
        this.serverOneWayConfig = Object.assign(meta1.serverOneWayConfig, meta2.serverOneWayConfig);
        this.serverTwoWayConfig = Object.assign(meta1.serverTwoWayConfig, meta2.serverTwoWayConfig);

    }
}